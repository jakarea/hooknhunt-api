<?php

namespace App\Modules\Website\Services\Website;

use App\Modules\Website\Models\WebsiteOrder;
use App\Modules\Website\Models\WebsiteOrderActivityLog;
use App\Modules\Website\Models\WebsiteOrderItem;
use App\Modules\Website\Models\WebsiteOrderStatusHistory;
use App\Modules\Website\Models\WebsiteProductVariant;
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
    private OrderStatusTransitionService $transitionService;

    public function __construct(
        SteadfastCourierService $courierService,
        OrderStatusTransitionService $transitionService
    ) {
        $this->courierService = $courierService;
        $this->transitionService = $transitionService;
    }

    // -------------------------------------------------------
    // STATUS MANAGEMENT
    // -------------------------------------------------------

    /**
     * Update order status with validation and logging.
     *
     * @param int $orderId Order ID
     * @param string $newStatus New status
     * @param string|null $note Optional note/comment
     * @param string|null $cancellationReason Cancellation reason (for cancelled status)
     * @return array Result with success status and message
     */
    public function updateStatus(int $orderId, string $newStatus, ?string $note = null, ?string $cancellationReason = null): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        // Validate status
        if (!in_array($newStatus, WebsiteOrder::STATUSES)) {
            return ['success' => false, 'message' => 'Invalid status', 'code' => 422];
        }

        $oldStatus = $order->status;
        $userId = Auth::id();

        // Validate transition using transition service
        $validation = $this->transitionService->validateTransition(
            $oldStatus,
            $newStatus,
            $note,
            $cancellationReason
        );

        if (!$validation['valid']) {
            return [
                'success' => false,
                'message' => $validation['error'],
                'code' => 422,
            ];
        }

        DB::transaction(function () use ($order, $oldStatus, $newStatus, $note, $cancellationReason, $userId) {
            // Format note with cancellation prefix if applicable
            $formattedNote = $this->transitionService->formatNote($note ?? '', $cancellationReason);

            // Update the order
            $order->status = $newStatus;

            // Set timestamp based on status
            match ($newStatus) {
                'approved' => $order->confirmed_at = now(),
                'processing' => $order->confirmed_at = $order->confirmed_at ?? now(),
                'sent_to_steadfast', 'shipped', 'in_review', 'in_transit' => $order->shipped_at = now(),
                'delivered', 'partial_delivered' => $order->delivered_at = now(),
                'cancelled' => $order->cancelled_at = now(),
                'completed' => $order->confirmed_at = $order->confirmed_at ?? now(),
                default => null,
            };

            // Set cancellation reason if provided
            if ($cancellationReason) {
                $order->cancellation_reason = $cancellationReason;
                $order->cancellation_detail = $note;
            }

            // Lock editing after certain statuses
            if ($this->transitionService->isTerminalStatus($newStatus)) {
                $order->editing_locked = true;
            }

            // Append note
            if ($formattedNote) {
                $order->note = trim(($order->note ? $order->note . "\n" : '') . $formattedNote);
            }

            $order->save();

            // Log status change
            WebsiteOrderStatusHistory::logChange(
                $order->id,
                $newStatus,
                $oldStatus,
                $formattedNote,
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

            // Log transition for debugging
            $this->transitionService->logTransition($order->id, $oldStatus, $newStatus, $formattedNote);
        });

        // Auto-send to Steadfast when status changes to sent_to_steadfast
        if ($newStatus === 'sent_to_steadfast' && !$order->sent_to_courier) {
            $courierResult = $this->courierService->sendOrder($order->id);
            if (!$courierResult['success']) {
                Log::warning("Failed to auto-send order {$order->id} to Steadfast: " . $courierResult['message']);
            }
        }

        return [
            'success' => true,
            'message' => "Status updated to {$this->transitionService->getTransitionLabel($oldStatus, $newStatus)}",
            // Module independence: Return order without cross-module relationships
            'data' => $order->fresh()->load('items'),
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

        $variant = WebsiteProductVariant::where('catalog_variant_id', $itemData['product_variant_id'])
            ->firstOrFail();

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
                // Module independence: Return order without cross-module relationships
                'data' => $order->fresh()->load('items'),
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
                $newVariant = WebsiteProductVariant::where('catalog_variant_id', $itemData['product_variant_id'])
                    ->first();

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
                // Module independence: Return order without cross-module relationships
                'data' => $order->fresh()->load('items'),
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
                // Module independence: Return order without cross-module relationships
                'data' => $order->fresh()->load('items'),
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

        // Validate transition
        $validation = $this->transitionService->validateTransition(
            $order->status,
            'sent_to_steadfast',
            null,
            null
        );

        if (!$validation['valid']) {
            return [
                'success' => false,
                'message' => $validation['error'],
                'code' => 422,
            ];
        }

        // Validate required fields
        $customerData = $order->getCustomerData();
        $shippingData = $order->getShippingData();

        if (empty($customerData['phone'])) {
            return ['success' => false, 'message' => '\App\Modules\CRM\Models\Customer phone is required', 'code' => 422];
        }

        if (empty($shippingData['address'])) {
            return ['success' => false, 'message' => 'Shipping address is required', 'code' => 422];
        }

        // Prevent duplicate send
        if ($order->sent_to_courier) {
            return ['success' => false, 'message' => 'Order already sent to courier', 'code' => 422];
        }

        // Call Steadfast API
        $result = $this->courierService->createOrder($order);

        if (!$result['success']) {
            $errorMessage = $result['message'] ?? 'Unknown error';
            if (is_array($errorMessage)) {
                $errorMessage = implode(', ', $errorMessage);
            }

            WebsiteOrderActivityLog::log(
                $order->id,
                'courier_failed',
                'Courier API failed: ' . $errorMessage,
                null,
                ['error' => $errorMessage],
                Auth::id()
            );

            return [
                'success' => false,
                'message' => 'Courier API error: ' . $errorMessage,
                'code' => 502,
            ];
        }

        // Update order with courier data
        DB::transaction(function () use ($order, $result) {
            $oldStatus = $order->status;

            $order->consignment_id = $result['consignment_id'];
            $order->tracking_code = $result['tracking_code'];
            $order->tracking_link = $result['tracking_link'] ?? null;
            $order->sent_to_courier = true;
            $order->delivery_status = 'pending';
            $order->status = 'sent_to_steadfast';
            $order->shipped_at = now();
            $order->editing_locked = true;
            $order->save();

            WebsiteOrderStatusHistory::logChange(
                $order->id,
                'sent_to_steadfast',
                $oldStatus,
                'Sent to Steadfast courier. Tracking: ' . $result['tracking_code'],
                Auth::id()
            );

            WebsiteOrderActivityLog::log(
                $order->id,
                'sent_to_courier',
                'Order sent to Steadfast. Consignment: ' . $result['consignment_id'],
                null,
                [
                    'consignment_id' => $result['consignment_id'],
                    'tracking_code' => $result['tracking_code'],
                    'tracking_link' => $result['tracking_link'] ?? null,
                ],
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
                // Module independence: Return order without cross-module relationships
                'data' => $order->fresh()->load('items'),
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
            "\App\Modules\Finance\Models\Payment updated: {$paymentStatus}, amount: {$paidAmount}",
            $oldData,
            ['payment_status' => $order->payment_status, 'paid_amount' => $order->paid_amount],
            Auth::id()
        );

        return [
            'success' => true,
            'message' => '\App\Modules\Finance\Models\Payment updated successfully',
            'data' => $order->fresh(),
        ];
    }

    // -------------------------------------------------------
    // BULK OPERATIONS
    // -------------------------------------------------------

    /**
     * Bulk update order status.
     *
     * @param array $orderIds Array of order IDs
     * @param string $newStatus The new status
     * @param string|null $note Optional note/comment
     * @param string|null $cancellationReason Cancellation reason for cancelled status
     * @return array Result with success count and details
     */
    public function bulkUpdateStatus(array $orderIds, string $newStatus, ?string $note = null, ?string $cancellationReason = null): array
    {
        $results = [];
        $successCount = 0;
        $failCount = 0;

        foreach ($orderIds as $orderId) {
            $result = $this->updateStatus($orderId, $newStatus, $note, $cancellationReason);
            $results[] = [
                'order_id' => $orderId,
                'success' => $result['success'],
                'message' => $result['message'] ?? 'Unknown error',
            ];

            if ($result['success']) {
                $successCount++;
            } else {
                $failCount++;
            }
        }

        return [
            'success' => $successCount > 0,
            'message' => "Updated {$successCount} of " . count($orderIds) . " orders successfully. {$failCount} failed.",
            'data' => [
                'total' => count($orderIds),
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'results' => $results,
            ],
        ];
    }

    /**
     * Bulk send orders to Steadfast courier with delay.
     *
     * @param array $orderIds Array of order IDs
     * @param float $delaySeconds Delay between each API call
     * @return array Result with success count and details
     */
    public function bulkSendToCourier(array $orderIds, float $delaySeconds = 0.5): array
    {
        $results = [];
        $successCount = 0;
        $failCount = 0;

        foreach ($orderIds as $index => $orderId) {
            // Add delay between requests (except for the first one)
            if ($index > 0) {
                usleep((int)($delaySeconds * 1000000)); // Convert to microseconds
            }

            $result = $this->sendToCourier($orderId);
            $results[] = [
                'order_id' => $orderId,
                'success' => $result['success'],
                'message' => $result['message'] ?? 'Unknown error',
            ];

            if ($result['success']) {
                $successCount++;
            } else {
                $failCount++;
            }
        }

        return [
            'success' => $successCount > 0,
            'message' => "Sent {$successCount} of " . count($orderIds) . " orders to courier. {$failCount} failed.",
            'data' => [
                'total' => count($orderIds),
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'results' => $results,
            ],
        ];
    }

    // -------------------------------------------------------
    // DELETE OPERATIONS
    // -------------------------------------------------------

    /**
     * Delete a single order (soft delete).
     * Cannot delete completed or cancelled orders.
     *
     * @param int $orderId Order ID
     * @return array Result with success status and message
     */
    public function deleteOrder(int $orderId): array
    {
        $order = WebsiteOrder::find($orderId);

        if (!$order) {
            return ['success' => false, 'message' => 'Order not found', 'code' => 404];
        }

        // Prevent deletion of completed or cancelled orders
        if (in_array($order->status, ['completed', 'cancelled'])) {
            return [
                'success' => false,
                'message' => "Cannot delete {$order->status} orders. They should be kept for records.",
                'code' => 422,
            ];
        }

        $userId = Auth::id();
        $invoiceNo = $order->invoice_no;

        // Soft delete the order
        $order->delete();

        // Log the deletion
        WebsiteOrderActivityLog::log(
            $orderId,
            'order_deleted',
            "Order #{$invoiceNo} was deleted (soft delete)",
            ['status' => $order->status, 'invoice_no' => $invoiceNo],
            null,
            $userId
        );

        return [
            'success' => true,
            'message' => "Order #{$invoiceNo} deleted successfully",
            'data' => ['order_id' => $orderId, 'invoice_no' => $invoiceNo],
        ];
    }

    /**
     * Bulk delete orders (soft delete).
     * Cannot delete completed or cancelled orders.
     *
     * @param array $orderIds Array of order IDs
     * @return array Result with success count and details
     */
    public function bulkDeleteOrders(array $orderIds): array
    {
        $results = [];
        $successCount = 0;
        $failCount = 0;
        $skippedCount = 0;

        foreach ($orderIds as $orderId) {
            $order = WebsiteOrder::withTrashed()->find($orderId);

            if (!$order) {
                $results[] = [
                    'order_id' => $orderId,
                    'success' => false,
                    'message' => 'Order not found',
                ];
                $failCount++;
                continue;
            }

            // Skip already deleted orders
            if ($order->trashed()) {
                $results[] = [
                    'order_id' => $orderId,
                    'success' => false,
                    'message' => 'Order already deleted',
                    'skipped' => true,
                ];
                $skippedCount++;
                continue;
            }

            // Prevent deletion of completed or cancelled orders
            if (in_array($order->status, ['completed', 'cancelled'])) {
                $results[] = [
                    'order_id' => $orderId,
                    'success' => false,
                    'message' => "Cannot delete {$order->status} orders",
                    'skipped' => true,
                ];
                $skippedCount++;
                continue;
            }

            $invoiceNo = $order->invoice_no;

            // Soft delete the order
            $order->delete();

            // Log the deletion
            WebsiteOrderActivityLog::log(
                $orderId,
                'order_deleted',
                "Order #{$invoiceNo} was deleted (bulk soft delete)",
                ['status' => $order->status, 'invoice_no' => $invoiceNo],
                null,
                Auth::id()
            );

            $results[] = [
                'order_id' => $orderId,
                'success' => true,
                'message' => "Order #{$invoiceNo} deleted",
            ];

            $successCount++;
        }

        $message = "Deleted {$successCount} of " . count($orderIds) . " orders successfully.";
        if ($failCount > 0) {
            $message .= " {$failCount} failed.";
        }
        if ($skippedCount > 0) {
            $message .= " {$skippedCount} skipped (completed/cancelled/already deleted).";
        }

        return [
            'success' => $successCount > 0,
            'message' => $message,
            'data' => [
                'total' => count($orderIds),
                'success_count' => $successCount,
                'fail_count' => $failCount,
                'skipped_count' => $skippedCount,
                'results' => $results,
            ],
        ];
    }
}
