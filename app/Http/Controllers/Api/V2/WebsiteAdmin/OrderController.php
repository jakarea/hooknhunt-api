<?php

namespace App\Http\Controllers\Api\V2\WebsiteAdmin;

use App\Http\Controllers\Controller;
use App\Services\AlphaSmsService;
use App\Services\Website\DeliveryChargeCalculator;
use App\Services\Website\OrderManagementService;
use App\Models\Website\WebsiteOrder;
use App\Models\Website\WebsiteOrderItem;
use App\Models\Website\WebsiteOrderStatusHistory;
use App\Models\Website\WebsiteOrderActivityLog;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    private OrderManagementService $orderService;

    public function __construct(OrderManagementService $orderService)
    {
        $this->orderService = $orderService;
    }

    // -------------------------------------------------------
    // ORDER LISTING
    // -------------------------------------------------------

    /**
     * List all website orders with filters and pagination.
     * GET /api/v2/website-admin/orders
     */
    public function index(Request $request): JsonResponse
    {
        $query = WebsiteOrder::with(['customer', 'items.variant.product']);

        // Search by invoice, customer name, phone
        if ($request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhereHas('customer', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%")
                         ->orWhere('phone', 'like', "%{$search}%");
                  });
            });
        }

        // Filters
        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }
        if ($request->channel) {
            $query->where('channel', $request->channel);
        }
        if ($request->sent_to_courier !== null) {
            $query->where('sent_to_courier', $request->boolean('sent_to_courier'));
        }
        if ($request->from_date) {
            $query->whereDate('created_at', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('created_at', '<=', $request->to_date);
        }

        $orders = $query->latest()
            ->paginate($request->per_page ?? 20)
            ->through(fn ($order) => $this->transformOrderListItem($order));

        return response()->json(['success' => true, 'data' => $orders]);
    }

    // -------------------------------------------------------
    // ORDER DETAIL
    // -------------------------------------------------------

    /**
     * Get single order with full details.
     * GET /api/v2/website-admin/orders/{id}
     */
    public function show(int $id): JsonResponse
    {
        $order = WebsiteOrder::with([
            'customer',
            'items.variant.product.thumbnail',
            'soldByUser',
            'statusHistories.changedByUser',
            'activityLogs.performedByUser',
        ])->find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => array_merge($this->transformOrderDetail($order), [
                'allowed_next_statuses' => WebsiteOrder::allowedStatusTransitions($order->status),
                'is_editable' => $order->isEditable(),
                'can_send_to_courier' => $order->canSendToCourier(),
            ]),
        ]);
    }

    // -------------------------------------------------------
    // STATUS MANAGEMENT
    // -------------------------------------------------------

    /**
     * Update order status.
     * PUT /api/v2/website-admin/orders/{id}/status
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', WebsiteOrder::STATUSES),
            'comment' => 'nullable|string|max:500',
        ]);

        $result = $this->orderService->updateStatus($id, $validated['status'], $validated['comment'] ?? null);

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // PAYMENT
    // -------------------------------------------------------

    /**
     * Update payment info.
     * PUT /api/v2/website-admin/orders/{id}/payment
     */
    public function updatePayment(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'payment_status' => 'required|in:unpaid,paid,partial',
            'paid_amount' => 'required|numeric|min:0',
        ]);

        $result = $this->orderService->updatePayment($id, $validated['payment_status'], $validated['paid_amount']);

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // ITEM MANAGEMENT
    // -------------------------------------------------------

    /**
     * Add item to order.
     * POST /api/v2/website-admin/orders/{id}/items
     */
    public function addItem(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'required|integer|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'unit_price' => 'nullable|numeric|min:0',
            'weight' => 'nullable|numeric|min:0',
        ]);

        $result = $this->orderService->addItem($id, $validated);

        if ($result['success'] && isset($result['data'])) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Update an order item.
     * PUT /api/v2/website-admin/orders/{orderId}/items/{itemId}
     */
    public function updateItem(Request $request, int $orderId, int $itemId): JsonResponse
    {
        $validated = $request->validate([
            'product_variant_id' => 'sometimes|integer|exists:product_variants,id',
            'quantity' => 'sometimes|integer|min:1',
            'unit_price' => 'sometimes|numeric|min:0',
            'weight' => 'sometimes|numeric|min:0',
        ]);

        $result = $this->orderService->updateItem($orderId, $itemId, $validated);

        if ($result['success'] && isset($result['data'])) {
            $result['data'] = $this->buildFullOrderResponse($orderId);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Remove item from order.
     * DELETE /api/v2/website-admin/orders/{orderId}/items/{itemId}
     */
    public function removeItem(int $orderId, int $itemId): JsonResponse
    {
        $result = $this->orderService->removeItem($orderId, $itemId);

        if ($result['success']) {
            $result['data'] = $this->buildFullOrderResponse($orderId);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // COURIER INTEGRATION
    // -------------------------------------------------------

    /**
     * Send order to Steadfast courier.
     * POST /api/v2/website-admin/orders/{id}/send-to-courier
     */
    public function sendToCourier(int $id): JsonResponse
    {
        $result = $this->orderService->sendToCourier($id);

        if ($result['success']) {
            $freshOrder = WebsiteOrder::with([
                'customer', 'items.variant.product.thumbnail', 'soldByUser',
                'statusHistories.changedByUser', 'activityLogs.performedByUser',
            ])->find($id);
            $result['data'] = array_merge($this->transformOrderDetail($freshOrder), [
                'allowed_next_statuses' => WebsiteOrder::allowedStatusTransitions($freshOrder->status),
                'is_editable' => $freshOrder->isEditable(),
                'can_send_to_courier' => $freshOrder->canSendToCourier(),
            ]);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    /**
     * Sync delivery status from courier.
     * POST /api/v2/website-admin/orders/{id}/sync-courier
     */
    public function syncCourierStatus(int $id): JsonResponse
    {
        $result = $this->orderService->syncCourierStatus($id);

        if ($result['success']) {
            $freshOrder = WebsiteOrder::with([
                'customer', 'items.variant.product.thumbnail', 'soldByUser',
                'statusHistories.changedByUser', 'activityLogs.performedByUser',
            ])->find($id);
            $result['data'] = array_merge($this->transformOrderDetail($freshOrder), [
                'allowed_next_statuses' => WebsiteOrder::allowedStatusTransitions($freshOrder->status),
                'is_editable' => $freshOrder->isEditable(),
                'can_send_to_courier' => $freshOrder->canSendToCourier(),
            ]);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // ORDER UPDATE (misc fields)
    // -------------------------------------------------------

    /**
     * Update order-level fields.
     * PUT /api/v2/website-admin/orders/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'delivery_charge' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'note' => 'nullable|string|max:1000',
            'coupon_code' => 'nullable|string|max:50',
            'append_note' => 'nullable|string|max:500',
        ]);

        $result = $this->orderService->updateOrder($id, $validated);

        if ($result['success'] && isset($result['data'])) {
            $result['data'] = $this->buildFullOrderResponse($id);
        }

        return response()->json($result, $result['code'] ?? 200);
    }

    // -------------------------------------------------------
    // DELIVERY CHARGE CALCULATOR
    // -------------------------------------------------------

    /**
     * Calculate delivery charge based on weight and destination.
     * POST /api/v2/website-admin/orders/calculate-delivery
     */
    public function calculateDeliveryCharge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'weight' => 'required|numeric|min:0',
            'division' => 'required|string|max:100',
        ]);

        $breakdown = DeliveryChargeCalculator::breakdown($validated['weight'], $validated['division']);

        return response()->json([
            'success' => true,
            'data' => $breakdown,
        ]);
    }

    // -------------------------------------------------------
    // STATISTICS
    // -------------------------------------------------------

    /**
     * Get order statistics for dashboard.
     * GET /api/v2/website-admin/orders/statistics
     */
    public function statistics(): JsonResponse
    {
        $baseQuery = WebsiteOrder::query();

        $stats = [
            'total' => (clone $baseQuery)->count(),
            'pending' => (clone $baseQuery)->byStatus('pending')->count(),
            'processing' => (clone $baseQuery)->byStatus('processing')->count(),
            'on_hold' => (clone $baseQuery)->byStatus('on_hold')->count(),
            'approved' => (clone $baseQuery)->byStatus('approved')->count(),
            'on_shipping' => (clone $baseQuery)->byStatus('on_shipping')->count(),
            'shipped' => (clone $baseQuery)->byStatus('shipped')->count(),
            'completed' => (clone $baseQuery)->byStatus('completed')->count(),
            'cancelled' => (clone $baseQuery)->byStatus('cancelled')->count(),
            'returned' => (clone $baseQuery)->byStatus('returned')->count(),
            'total_revenue' => (float) (clone $baseQuery)->byStatus('completed')->sum('total_amount'),
            'total_pending_amount' => (float) (clone $baseQuery)->active()->sum('total_amount'),
            'today_orders' => (clone $baseQuery)->whereDate('created_at', today())->count(),
            'today_revenue' => (float) (clone $baseQuery)->whereDate('created_at', today())->byStatus('completed')->sum('total_amount'),
        ];

        return response()->json(['success' => true, 'data' => $stats]);
    }

    // -------------------------------------------------------
    // PRODUCT SEARCH (for adding items)
    // -------------------------------------------------------

    /**
     * Search product variants by name or SKU.
     * GET /api/v2/website-admin/products/search
     */
    public function searchProducts(Request $request): JsonResponse
    {
        $q = $request->get('q', '');

        if (strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $results = ProductVariant::with(['product.thumbnail'])
            ->where(function ($query) use ($q) {
                $query->where('sku', 'like', "%{$q}%")
                      ->orWhere('variant_name', 'like', "%{$q}%")
                      ->orWhereHas('product', function ($pq) use ($q) {
                          $pq->where('name', 'like', "%{$q}%")
                             ->orWhere('wholesale_name', 'like', "%{$q}%");
                      });
            })
            ->whereHas('product', function ($pq) {
                $pq->where('status', 'published');
            })
            ->limit(20)
            ->get();

        $data = $results->map(fn ($variant) => [
            'variant_id' => $variant->id,
            'product_name' => $variant->product?->name,
            'wholesale_name' => $variant->product?->wholesale_name,
            'variant_name' => $variant->variant_name,
            'sku' => $variant->sku,
            'price' => (float) $variant->price,
            'weight' => (float) ($variant->weight ?? 0),
            'thumbnail' => $variant->product?->thumbnail?->full_url,
            'stock' => (int) $variant->stock,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Get all variants of a product.
     * GET /api/v2/website-admin/products/{id}/variants
     */
    public function productVariants(int $id): JsonResponse
    {
        $variants = ProductVariant::with(['product.thumbnail'])
            ->where('product_id', $id)
            ->whereHas('product', fn ($q) => $q->where('status', 'published'))
            ->get();

        $data = $variants->map(fn ($variant) => [
            'variant_id' => $variant->id,
            'product_name' => $variant->product?->name,
            'wholesale_name' => $variant->product?->wholesale_name,
            'variant_name' => $variant->variant_name,
            'sku' => $variant->sku,
            'price' => (float) $variant->price,
            'weight' => (float) ($variant->weight ?? 0),
            'thumbnail' => $variant->product?->thumbnail?->full_url,
            'stock' => (int) $variant->stock,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Search products by name or SKU (returns products, not variants).
     * GET /api/v2/website-admin/products/search-products
     */
    public function searchProductsGrouped(Request $request): JsonResponse
    {
        $q = $request->get('q', '');

        if (strlen($q) < 2) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $products = Product::with(['thumbnail'])
            ->where('status', 'published')
            ->where(function ($query) use ($q) {
                $query->where('name', 'like', "%{$q}%")
                      ->orWhere('wholesale_name', 'like', "%{$q}%")
                      ->orWhereHas('variants', function ($vq) use ($q) {
                          $vq->where('sku', 'like', "%{$q}%");
                      });
            })
            ->withCount('variants')
            ->having('variants_count', '>', 0)
            ->limit(20)
            ->get();

        $data = $products->map(fn ($product) => [
            'id' => $product->id,
            'name' => $product->name,
            'wholesale_name' => $product->wholesale_name,
            'thumbnail' => $product->thumbnail?->full_url,
            'variants_count' => $product->variants_count,
        ]);

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Get top selling products based on order item quantity.
     * GET /api/v2/website-admin/products/top-selling
     */
    public function topSellingProducts(): JsonResponse
    {
        $topProductIds = WebsiteOrderItem::selectRaw('product_variants.product_id, SUM(sales_order_items.quantity) as total_sold')
            ->join('product_variants', 'sales_order_items.product_variant_id', '=', 'product_variants.id')
            ->join('sales_orders', 'sales_order_items.sales_order_id', '=', 'sales_orders.id')
            ->whereNotIn('sales_orders.status', ['cancelled', 'draft'])
            ->groupBy('product_variants.product_id')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->pluck('total_sold', 'product_id');

        if ($topProductIds->isEmpty()) {
            return response()->json(['success' => true, 'data' => []]);
        }

        $products = Product::with(['thumbnail'])
            ->whereIn('id', $topProductIds->keys())
            ->where('status', 'published')
            ->withCount('variants')
            ->get()
            ->sortByDesc(fn ($p) => $topProductIds[$p->id]);

        $data = $products->map(fn ($product) => [
            'id' => $product->id,
            'name' => $product->name,
            'wholesale_name' => $product->wholesale_name,
            'thumbnail' => $product->thumbnail?->full_url,
            'variants_count' => $product->variants_count,
            'total_sold' => (int) $topProductIds[$product->id],
        ])->values();

        return response()->json(['success' => true, 'data' => $data]);
    }

    // -------------------------------------------------------
    // STATUS HISTORY
    // -------------------------------------------------------

    /**
     * Get status history for an order.
     * GET /api/v2/website-admin/orders/{id}/status-history
     */
    public function statusHistory(int $id): JsonResponse
    {
        $histories = WebsiteOrderStatusHistory::where('order_id', $id)
            ->with('changedByUser:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['success' => true, 'data' => $histories]);
    }

    /**
     * Get activity log for an order.
     * GET /api/v2/website-admin/orders/{id}/activity-log
     */
    public function activityLog(int $id): JsonResponse
    {
        $logs = WebsiteOrderActivityLog::where('order_id', $id)
            ->with('performedByUser:id,name')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json(['success' => true, 'data' => $logs]);
    }

    // -------------------------------------------------------
    // SMS TO CUSTOMER
    // -------------------------------------------------------

    /**
     * Send SMS to the order's customer.
     * POST /api/v2/website-admin/orders/{id}/send-sms
     */
    public function sendSms(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|max:160',
        ]);

        $order = WebsiteOrder::find($id);

        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        $customerData = $order->getCustomerData();
        $phone = $customerData['phone'] ?? null;

        if (empty($phone)) {
            return response()->json(['success' => false, 'message' => 'Customer phone number not found'], 422);
        }

        $smsService = new AlphaSmsService();
        $result = $smsService->sendSms($validated['message'], $phone);

        $hasError = isset($result['error']) && $result['error'] !== 0;

        WebsiteOrderActivityLog::log(
            $order->id,
            $hasError ? 'sms_failed' : 'sms_sent',
            $hasError
                ? 'SMS failed: ' . ($result['msg'] ?? 'Unknown error')
                : 'SMS sent to ' . $phone,
            null,
            ['message' => $validated['message'], 'phone' => $phone, 'api_response' => $result],
            auth()->id()
        );

        if ($hasError) {
            return response()->json([
                'success' => false,
                'message' => 'SMS failed: ' . ($result['msg'] ?? 'Unknown error'),
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'SMS sent successfully',
        ]);
    }

    // -------------------------------------------------------
    // TRANSFORMERS
    // -------------------------------------------------------

    private function buildFullOrderResponse(int $orderId): array
    {
        $order = WebsiteOrder::with([
            'customer', 'items.variant.product.thumbnail', 'soldByUser',
            'statusHistories.changedByUser', 'activityLogs.performedByUser',
        ])->find($orderId);

        return array_merge($this->transformOrderDetail($order), [
            'allowed_next_statuses' => WebsiteOrder::allowedStatusTransitions($order->status),
            'is_editable' => $order->isEditable(),
            'can_send_to_courier' => $order->canSendToCourier(),
        ]);
    }

    private function transformOrderListItem(WebsiteOrder $order): array
    {
        $shippingData = $order->getShippingData();

        return [
            'id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'channel' => $order->channel,
            'status' => $order->status,
            'status_label' => $order->status_label,
            'payment_status' => $order->payment_status,
            'delivery_status' => $order->delivery_status,
            'sub_total' => (float) $order->sub_total,
            'discount_amount' => (float) $order->discount_amount,
            'delivery_charge' => (float) $order->delivery_charge,
            'total_amount' => (float) $order->total_amount,
            'paid_amount' => (float) $order->paid_amount,
            'due_amount' => $order->due_amount,
            'total_weight' => (float) $order->total_weight,
            'item_count' => $order->items->count(),
            'sent_to_courier' => (bool) $order->sent_to_courier,
            'tracking_code' => $order->tracking_code,
            'customer' => $order->customer ? [
                'id' => $order->customer->id,
                'name' => $order->customer->name,
                'phone' => $order->customer->phone,
            ] : null,
            'shipping_division' => $shippingData['division'] ?? null,
            'is_editable' => $order->isEditable(),
            'created_at' => $order->created_at?->toIso8601String(),
            'shipped_at' => $order->shipped_at?->toIso8601String(),
        ];
    }

    private function transformOrderDetail(WebsiteOrder $order): array
    {
        $shippingData = $order->getShippingData();
        $customerData = $order->getCustomerData();
        $paymentData = $order->getPaymentData();

        return [
            'id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'channel' => $order->channel,
            'status' => $order->status,
            'status_label' => $order->status_label,
            'payment_status' => $order->payment_status,
            'delivery_status' => $order->delivery_status,
            'sub_total' => (float) $order->sub_total,
            'discount_amount' => (float) $order->discount_amount,
            'delivery_charge' => (float) $order->delivery_charge,
            'total_amount' => (float) $order->total_amount,
            'paid_amount' => (float) $order->paid_amount,
            'due_amount' => $order->due_amount,
            'total_weight' => (float) $order->total_weight,
            'total_profit' => (float) $order->total_profit,
            'coupon_code' => $order->coupon_code,
            'note' => $order->note,
            'editing_locked' => (bool) $order->editing_locked,
            'sent_to_courier' => (bool) $order->sent_to_courier,
            'consignment_id' => $order->consignment_id,
            'tracking_code' => $order->tracking_code,
            'shipping' => $shippingData,
            'customer_info' => array_merge(
                $order->customer ? [
                    'id' => $order->customer->id,
                    'name' => $order->customer->name,
                    'phone' => $order->customer->phone,
                    'type' => $order->customer->type,
                    'summary' => $this->getCustomerSummary($order->customer->id, $order->id),
                ] : [],
                $customerData
            ),
            'payment' => $paymentData,
            'sold_by' => $order->soldByUser ? [
                'id' => $order->soldByUser->id,
                'name' => $order->soldByUser->name,
            ] : null,
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'product_variant_id' => $item->product_variant_id,
                'product_id' => $item->variant?->product?->id,
                'product_name' => $item->variant?->product?->name ?? 'Unknown',
                'wholesale_name' => $item->variant?->product?->wholesale_name ?? null,
                'variant_name' => $item->variant?->variant_name ?? $item->variant?->sku ?? 'N/A',
                'sku' => $item->variant?->sku,
                'thumbnail' => $item->variant?->product?->thumbnail?->full_url ?? null,
                'variant_weight' => (float) ($item->variant?->weight ?? 0),
                'quantity' => $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'total_price' => (float) $item->total_price,
                'total_cost' => (float) $item->total_cost,
                'profit' => $item->profit,
                'weight' => (float) $item->weight,
                'total_weight' => $item->total_weight,
            ])->toArray(),
            'status_history' => $order->statusHistories->map(fn ($h) => [
                'id' => $h->id,
                'from_status' => $h->from_status,
                'to_status' => $h->to_status,
                'comment' => $h->comment,
                'changed_by' => $h->changedByUser?->name,
                'created_at' => $h->created_at->toIso8601String(),
            ])->toArray(),
            'recent_activities' => $order->activityLogs()->latest()->limit(10)->get()->map(fn ($log) => [
                'id' => $log->id,
                'action' => $log->action,
                'description' => $log->description,
                'old_data' => $log->old_data,
                'new_data' => $log->new_data,
                'performed_by' => $log->performedByUser?->name,
                'created_at' => $log->created_at->toIso8601String(),
            ])->toArray(),
            'timestamps' => [
                'created_at' => $order->created_at?->toIso8601String(),
                'confirmed_at' => $order->confirmed_at?->toIso8601String(),
                'shipped_at' => $order->shipped_at?->toIso8601String(),
                'cancelled_at' => $order->cancelled_at?->toIso8601String(),
            ],
        ];
    }

    private function getCustomerSummary(int $customerId, int $currentOrderId): array
    {
        $orders = WebsiteOrder::where('customer_id', $customerId)->get();
        $completedOrders = $orders->where('status', 'completed');
        $canceledOrders = $orders->where('status', 'cancelled');

        $completed = $completedOrders->count();
        $canceled = $canceledOrders->count();
        $total = $orders->count();

        // Rating: 5 - (canceled/total * 5), min 0
        $rating = $total > 0 ? max(0, round(5 - ($canceled / $total * 5), 1)) : 5;

        $previousOrder = $orders->where('id', '!=', $currentOrderId)
            ->sortByDesc('created_at')
            ->first();

        return [
            'total_orders' => $total,
            'completed_orders' => $completed,
            'canceled_orders' => $canceled,
            'total_spent' => (float) $completedOrders->sum('total_amount'),
            'rating' => $rating,
            'last_order_date' => $previousOrder?->created_at?->toIso8601String(),
            'last_order_invoice' => $previousOrder?->invoice_no,
        ];
    }
}
