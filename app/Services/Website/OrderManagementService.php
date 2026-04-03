<?php

namespace App\Services\Website;

use App\Models\Website\WebsiteOrder;
use App\Models\Website\WebsiteOrderActivityLog;
use App\Models\Website\WebsiteOrderItem;
use App\Models\Website\WebsiteOrderStatusHistory;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Core order management service for Website module.
 * Handles status transitions, item editing, courier integration, and activity logging.
 */
class OrderManagementService
{
    private SteadfastCourierService $courierService;

    public function __construct(SteadfastCourierService $courierService)
    {
        $this->courierService = $courierService;
    }

    // -------------------------------------------------------
    // STATUS MANAGEMENT
    // -------------------------------------------------------

    /**
     * Update order status with validation and logging.
     */
    public function updateStatus(int $orderId, string $newStatus, ?string $comment = null): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        if (!in_array($newStatus, WebsiteOrder::STATUSES)) {
            return ['success' => false, 'message' => 'Invalid status.', 'code' => 422];
        }

        $oldStatus = $order->status;
        $userId = Auth::id();

        DB::transaction(function () use ($order, $oldStatus, $newStatus, $comment, $userId) {
            // Update the order
            $order->status = $newStatus;

            // Set timestamp based on status
            match ($newStatus) {
                'confirmed', 'approved' => $order->confirmed_at = now(),
                'shipped' => $order->shipped_at = now(),
                'cancelled' => $order->cancelled_at = now(),
                'completed' => $order->confirmed_at = $order->confirmed_at ?? now(),
                default => null,
            };

            // Lock editing after certain statuses
            if (in_array($newStatus, ['shipped', 'delivered', 'completed', 'cancelled'])) {
                $order->editing_locked = true;
            }

            $order->save();

            // Log status change
            WebsiteOrderStatusHistory::logChange(
                $order->id,
                $newStatus,
                $oldStatus,
                $comment,
                $userId
            );

            WebsiteOrderActivityLog::log(
                $order->id,
                'status_changed',
                "Status changed from '{$oldStatus}' to '{$newStatus}'",
                ['status' => $oldStatus],
                ['status' => $newStatus],
                $userId
            );
        });

        return [
            'success' => true,
            'message' => "Status updated to {$newStatus}",
            'data' => $order->fresh()->load('customer', 'items.variant.product'),
        ];
    }

    // -------------------------------------------------------
    // ITEM MANAGEMENT
    // -------------------------------------------------------

    /**
     * Add item to an order (only if editable).
     */
    public function addItem(int $orderId, array $itemData): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        if (!$order->isEditable()) {
            return ['success' => false, 'message' => 'Order is not editable', 'code' => 422];
        }

        $variant = ProductVariant::findOrFail($itemData['product_variant_id']);

        return DB::transaction(function () use ($order, $itemData, $variant) {
            $item = WebsiteOrderItem::create([
                'sales_order_id' => $order->id,
                'product_variant_id' => $variant->id,
                'quantity' => $itemData['quantity'],
                'unit_price' => $itemData['unit_price'] ?? (float) $variant->price,
                'total_price' => $itemData['quantity'] * ($itemData['unit_price'] ?? (float) $variant->price),
                'total_cost' => $itemData['quantity'] * (float) ($variant->purchase_cost ?? 0),
                'weight' => $itemData['weight'] ?? (float) ($variant->weight ?? 0),
            ]);

            $order->recalculateTotals();

            WebsiteOrderActivityLog::log(
                $order->id,
                'item_added',
                "Added item: {$variant->variant_name} x{$itemData['quantity']}",
                null,
                ['item_id' => $item->id, 'variant' => $variant->variant_name, 'qty' => $itemData['quantity']],
                Auth::id()
            );

            return [
                'success' => true,
                'message' => 'Item added successfully',
                'data' => $order->fresh()->load('customer', 'items.variant.product'),
            ];
        });
    }

    /**
     * Update an existing order item.
     */
    public function updateItem(int $orderId, int $itemId, array $itemData): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        if (!$order->isEditable()) {
            return ['success' => false, 'message' => 'Order is not editable', 'code' => 422];
        }

        $item = WebsiteOrderItem::where('sales_order_id', $orderId)->find($itemId);

        if (!$item) {
            return ['success' => false, 'message' => 'Item not found', 'code' => 404];
        }

        return DB::transaction(function () use ($order, $item, $itemData) {
            $oldData = [
                'product_variant_id' => $item->product_variant_id,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total_price' => $item->total_price,
            ];

            if (isset($itemData['product_variant_id'])) {
                $newVariant = ProductVariant::find($itemData['product_variant_id']);
                if ($newVariant) {
                    $item->product_variant_id = $newVariant->id;
                    $item->unit_price = (float) $newVariant->price;
                    $item->weight = (float) ($newVariant->weight ?? 0);
                    $item->total_price = $item->quantity * $item->unit_price;
                    $item->total_cost = $item->quantity * (float) ($newVariant->purchase_cost ?? 0);
                }
            }

            if (isset($itemData['quantity'])) {
                $item->quantity = $itemData['quantity'];
                $item->total_price = $item->quantity * $item->unit_price;
                $item->total_cost = $item->quantity * (float) ($item->total_cost / max(1, $item->getOriginal('quantity')));
            }

            if (isset($itemData['unit_price'])) {
                $item->unit_price = $itemData['unit_price'];
                $item->total_price = $item->quantity * $item->unit_price;
            }

            if (isset($itemData['weight'])) {
                $item->weight = $itemData['weight'];
            }

            $item->save();

            $order->recalculateTotals();

            WebsiteOrderActivityLog::log(
                $order->id,
                'item_updated',
                "Updated item #{$item->id}",
                $oldData,
                ['quantity' => $item->quantity, 'unit_price' => $item->unit_price, 'total_price' => $item->total_price],
                Auth::id()
            );

            return [
                'success' => true,
                'message' => 'Item updated successfully',
                'data' => $order->fresh()->load('customer', 'items.variant.product'),
            ];
        });
    }

    /**
     * Remove an item from an order.
     */
    public function removeItem(int $orderId, int $itemId): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        if (!$order->isEditable()) {
            return ['success' => false, 'message' => 'Order is not editable', 'code' => 422];
        }

        $item = WebsiteOrderItem::where('sales_order_id', $orderId)->find($itemId);

        if (!$item) {
            return ['success' => false, 'message' => 'Item not found', 'code' => 404];
        }

        return DB::transaction(function () use ($order, $item) {
            $variantName = $item->variant?->variant_name ?? "Item #{$item->id}";

            $item->delete();

            $order->recalculateTotals();

            WebsiteOrderActivityLog::log(
                $order->id,
                'item_removed',
                "Removed item: {$variantName}",
                ['item_id' => $item->id],
                null,
                Auth::id()
            );

            return [
                'success' => true,
                'message' => 'Item removed successfully',
                'data' => $order->fresh()->load('customer', 'items.variant.product'),
            ];
        });
    }

    // -------------------------------------------------------
    // COURIER INTEGRATION
    // -------------------------------------------------------

    /**
     * Send order to Steadfast courier.
     */
    public function sendToCourier(int $orderId): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        if (!$order->canSendToCourier()) {
            return [
                'success' => false,
                'message' => 'Order cannot be sent to courier. Must be approved or on_shipping status.',
                'code' => 422,
            ];
        }

        // Validate required fields
        $customerData = $order->getCustomerData();
        $shippingData = $order->getShippingData();

        if (empty($customerData['phone'])) {
            return ['success' => false, 'message' => 'Customer phone is required', 'code' => 422];
        }

        if (empty($shippingData['address'])) {
            return ['success' => false, 'message' => 'Shipping address is required', 'code' => 422];
        }

        if ((float) ($order->total_weight ?? 0) <= 0) {
            return ['success' => false, 'message' => 'Order weight must be greater than 0', 'code' => 422];
        }

        // Prevent duplicate send
        if ($order->sent_to_courier) {
            return ['success' => false, 'message' => 'Order already sent to courier', 'code' => 422];
        }

        // Call Steadfast API
        $result = $this->courierService->createOrder($order);

        if (!$result['success']) {
            WebsiteOrderActivityLog::log(
                $order->id,
                'courier_failed',
                'Courier API failed: ' . ($result['message'] ?? 'Unknown error'),
                null,
                ['error' => $result['message']],
                Auth::id()
            );

            return [
                'success' => false,
                'message' => 'Courier API error: ' . ($result['message'] ?? 'Unknown error'),
                'code' => 502,
            ];
        }

        // Update order with courier data
        DB::transaction(function () use ($order, $result) {
            $order->consignment_id = $result['consignment_id'];
            $order->tracking_code = $result['tracking_code'];
            $order->sent_to_courier = true;
            $order->delivery_status = 'in_review';
            $order->status = 'shipped';
            $order->shipped_at = now();
            $order->editing_locked = true;
            $order->save();

            WebsiteOrderStatusHistory::logChange(
                $order->id,
                'shipped',
                $order->status,
                'Sent to Steadfast courier',
                Auth::id()
            );

            WebsiteOrderActivityLog::log(
                $order->id,
                'sent_to_courier',
                'Order sent to Steadfast. Consignment: ' . $result['consignment_id'],
                null,
                ['consignment_id' => $result['consignment_id'], 'tracking_code' => $result['tracking_code']],
                Auth::id()
            );
        });

        return [
            'success' => true,
            'message' => 'Order sent to Steadfast successfully',
            'data' => [
                'consignment_id' => $result['consignment_id'],
                'tracking_code' => $result['tracking_code'],
            ],
        ];
    }

    /**
     * Sync delivery status from courier.
     */
    public function syncCourierStatus(int $orderId): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        if (!$order->tracking_code) {
            return ['success' => false, 'message' => 'No tracking code found', 'code' => 422];
        }

        $result = $this->courierService->syncOrderStatus($order);

        if ($result['success']) {
            WebsiteOrderActivityLog::log(
                $order->id,
                'courier_status_synced',
                'Courier status synced: ' . ($result['delivery_status'] ?? 'unknown'),
                null,
                ['delivery_status' => $result['delivery_status'] ?? null],
                Auth::id()
            );
        }

        return $result;
    }

    // -------------------------------------------------------
    // ORDER UPDATES
    // -------------------------------------------------------

    /**
     * Update order-level fields (delivery charge, discount, note).
     */
    public function updateOrder(int $orderId, array $data): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        // Notes can always be appended; other fields require editability
        $onlyNote = count($data) === 1 && isset($data['append_note']);
        if (!$order->isEditable() && !$onlyNote) {
            return ['success' => false, 'message' => 'Order is not editable', 'code' => 422];
        }

        $oldData = [];

        return DB::transaction(function () use ($order, $data, &$oldData) {
            $updatableFields = ['delivery_charge', 'discount_amount', 'note', 'coupon_code'];

            foreach ($updatableFields as $field) {
                if (array_key_exists($field, $data)) {
                    $oldData[$field] = $order->$field;
                    $order->$field = $data[$field];
                }
            }

            // Append note instead of replacing
            if (!empty($data['append_note'])) {
                $existing = $order->note ? rtrim($order->note, ', ') . ', ' : '';
                $order->note = $existing . $data['append_note'];
            }

            $order->save();
            $order->recalculateTotals();

            if (!empty($oldData)) {
                WebsiteOrderActivityLog::log(
                    $order->id,
                    'order_updated',
                    'Order fields updated',
                    $oldData,
                    $data,
                    Auth::id()
                );
            }

            return [
                'success' => true,
                'message' => 'Order updated successfully',
                'data' => $order->fresh()->load('customer', 'items.variant.product'),
            ];
        });
    }

    /**
     * Update payment info.
     */
    public function updatePayment(int $orderId, string $paymentStatus, float $paidAmount): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        $oldData = [
            'payment_status' => $order->payment_status,
            'paid_amount' => $order->paid_amount,
        ];

        $order->payment_status = $paymentStatus;
        $order->paid_amount = $paidAmount;

        if ((float) $paidAmount >= (float) $order->total_amount) {
            $order->payment_status = 'paid';
            $order->due_amount = 0;
        } else {
            $order->due_amount = (float) $order->total_amount - $paidAmount;
        }

        $order->save();

        WebsiteOrderActivityLog::log(
            $order->id,
            'payment_updated',
            "Payment updated: {$paymentStatus}, amount: {$paidAmount}",
            $oldData,
            ['payment_status' => $order->payment_status, 'paid_amount' => $order->paid_amount],
            Auth::id()
        );

        return [
            'success' => true,
            'message' => 'Payment updated successfully',
            'data' => $order->fresh(),
        ];
    }
}
