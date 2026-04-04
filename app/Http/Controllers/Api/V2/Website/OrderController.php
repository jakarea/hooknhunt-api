<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    use ApiResponse;

    /**
     * Place a new order (guest or authenticated).
     * POST /api/v2/store/orders
     */
    public function placeOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name'    => 'required|string|max:255',
            'customer_phone'   => 'required|string|max:20',
            'customer_email'   => 'nullable|email|max:255',
            'items'            => 'required|array|min:1',
            'items.*.product_id'  => 'required|integer|exists:products,id',
            'items.*.variant_id'  => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity'    => 'required|integer|min:1',
            'items.*.unit_price'  => 'required|numeric|min:0',
            'shipping_address' => 'required|string|max:500',
            'shipping_district' => 'nullable|string|max:100',
            'shipping_division' => 'nullable|string|max:100',
            'shipping_thana'   => 'nullable|string|max:100',
            'payment_method'   => 'required|string|max:50',
            'payment_details'  => 'nullable|string|max:255',
            'subtotal'         => 'required|numeric|min:0',
            'delivery_charge'  => 'nullable|numeric|min:0',
            'coupon_discount'  => 'nullable|numeric|min:0',
            'payable_amount'   => 'required|numeric|min:0',
            'notes'            => 'nullable|string|max:1000',
        ]);

        DB::beginTransaction();
        try {
            $customer = $this->resolveCustomer($validated, $request->user());

            $order = SalesOrder::create([
                'invoice_no'      => 'WEB-' . strtoupper(uniqid()),
                'customer_id'     => $customer->id,
                'channel'         => 'retail_web',
                'status'          => 'pending',
                'payment_status'  => $validated['payment_method'] === 'cod' ? 'unpaid' : 'paid',
                'sub_total'       => $validated['subtotal'],
                'discount_amount' => $validated['coupon_discount'] ?? 0,
                'delivery_charge' => $validated['delivery_charge'] ?? 0,
                'total_amount'    => $validated['payable_amount'],
                'paid_amount'     => $validated['payment_method'] === 'cod' ? 0 : $validated['payable_amount'],
                'due_amount'      => $validated['payment_method'] === 'cod' ? $validated['payable_amount'] : 0,
                'note'            => $validated['notes'] ?? null,
                'external_data'   => $this->buildShippingData($validated),
            ]);

            foreach ($validated['items'] as $item) {
                $variant = $this->resolveVariant($item);

                $unitPrice = $this->getEffectivePrice($variant);
                $quantity = (int) $item['quantity'];

                SalesOrderItem::create([
                    'sales_order_id'     => $order->id,
                    'product_variant_id' => $variant->id,
                    'quantity'           => $quantity,
                    'unit_price'         => $unitPrice,
                    'total_price'        => $unitPrice * $quantity,
                    'total_cost'         => (float) $variant->purchase_cost * $quantity,
                ]);

                $variant->decrement('stock', $quantity);
            }

            DB::commit();

            return $this->sendSuccess(
                $this->transformOrder($order->load('items.variant.product.thumbnail')),
                'Order placed successfully',
                201
            );

        } catch (\Illuminate\Validation\ValidationException $e) {
            DB::rollBack();
            throw $e;
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Website order placement failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return $this->sendError('Order placement failed. Please try again.', $e->getMessage(), 500);
        }
    }

    /**
     * Verify an order (e.g., payment confirmation).
     * POST /api/v2/store/orders/verify
     */
    public function verifyOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id'    => 'required|integer|exists:sales_orders,id',
            'payment_ref' => 'nullable|string|max:255',
        ]);

        $order = SalesOrder::findOrFail($validated['order_id']);

        if ($order->channel !== 'retail_web') {
            return $this->sendError('Invalid order for this channel.', null, 400);
        }

        if ($order->payment_status === 'paid') {
            return $this->sendSuccess($this->transformOrder($order), 'Order is already verified.');
        }

        $order->update([
            'payment_status' => 'paid',
            'paid_amount'    => $order->total_amount,
            'due_amount'     => 0,
            'status'         => 'processing',
        ]);

        return $this->sendSuccess(
            $this->transformOrder($order->fresh()),
            'Order verified successfully'
        );
    }

    /**
     * Get authenticated customer's orders.
     * GET /api/v2/store/account/orders
     */
    public function myOrders(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return $this->sendError('Unauthenticated', null, 401);
        }

        $customer = Customer::where('user_id', $user->id)->first();

        if (!$customer) {
            return $this->sendSuccess([], 'No orders found');
        }

        $orders = SalesOrder::where('customer_id', $customer->id)
            ->with('items.variant.product.thumbnail')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($order) => $this->transformOrder($order));

        return $this->sendSuccess($orders);
    }

    /**
     * Get authenticated customer's order summary.
     * GET /api/v2/store/account/orders/summary
     */
    public function orderSummary(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return $this->sendError('Unauthenticated', null, 401);
        }

        $customer = Customer::where('user_id', $user->id)->first();

        if (!$customer) {
            return $this->sendSuccess([
                'totalOrders'     => 0,
                'totalSpent'      => 0,
                'pendingOrders'   => 0,
                'completedOrders' => 0,
                'recentOrders'    => [],
            ]);
        }

        $orders = SalesOrder::where('customer_id', $customer->id);

        $totalOrders = $orders->count();
        $totalSpent = (clone $orders)->where('payment_status', 'paid')->sum('paid_amount');
        $pendingOrders = (clone $orders)->where('status', 'pending')->count();
        $completedOrders = (clone $orders)->where('status', 'delivered')->count();

        $recentOrders = SalesOrder::where('customer_id', $customer->id)
            ->with('items.variant.product.thumbnail')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(fn($order) => $this->transformOrder($order))
            ->values()
            ->toArray();

        return $this->sendSuccess([
            'totalOrders'     => $totalOrders,
            'totalSpent'      => (float) $totalSpent,
            'pendingOrders'   => $pendingOrders,
            'completedOrders' => $completedOrders,
            'recentOrders'    => $recentOrders,
        ]);
    }

    /**
     * Get a single order detail.
     * GET /api/v2/store/account/orders/{order}
     */
    public function show(Request $request, string $invoice_no): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return $this->sendError('Unauthenticated', null, 401);
        }

        $customer = Customer::where('user_id', $user->id)->first();

        if (!$customer) {
            return $this->sendError('Order not found', null, 404);
        }

        $salesOrder = SalesOrder::where('invoice_no', $invoice_no)
            ->where('customer_id', $customer->id)
            ->with('items.variant.product.thumbnail')
            ->firstOrFail();

        return $this->sendSuccess($this->transformOrder($salesOrder));
    }

    /**
     * Add a thank-you product to an existing order.
     * POST /api/v2/store/orders/{invoice_no}/add-thank-you
     */
    public function addThankYouProduct(Request $request, string $invoice_no): JsonResponse
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
        ]);

        $product = Product::where('id', $validated['product_id'])
            ->where('thank_you', true)
            ->where('status', 'published')
            ->first();

        if (!$product) {
            return $this->sendError('Product is not a valid thank-you product.', null, 422);
        }

        $order = SalesOrder::where('invoice_no', $invoice_no)
            ->where('channel', 'retail_web')
            ->whereIn('status', ['pending', 'processing', 'approved'])
            ->first();

        if (!$order) {
            return $this->sendError('Order not found or cannot be modified.', null, 404);
        }

        // Only allow within 5 minutes of order creation
        if ($order->created_at->diffInMinutes(now()) > 5) {
            return $this->sendError('This action is no longer available.', null, 410);
        }

        // Check if this product is already in the order
        $variant = ProductVariant::where('product_id', $product->id)
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->first();

        if (!$variant) {
            return $this->sendError('No active retail variant found for this product.', null, 422);
        }

        $alreadyExists = SalesOrderItem::where('sales_order_id', $order->id)
            ->where('product_variant_id', $variant->id)
            ->exists();

        if ($alreadyExists) {
            return $this->sendError('This product is already in the order.', null, 422);
        }

        DB::beginTransaction();
        try {
            $unitPrice = $this->getEffectivePrice($variant);
            $quantity = 1;

            SalesOrderItem::create([
                'sales_order_id'     => $order->id,
                'product_variant_id' => $variant->id,
                'quantity'           => $quantity,
                'unit_price'         => $unitPrice,
                'total_price'        => $unitPrice * $quantity,
                'total_cost'         => (float) $variant->purchase_cost * $quantity,
            ]);

            // Update order total
            $order->total_amount = (float) $order->total_amount + ($unitPrice * $quantity);
            $order->due_amount = (float) $order->due_amount + ($unitPrice * $quantity);
            $order->sub_total = (float) $order->sub_total + ($unitPrice * $quantity);
            $order->save();

            $order->load('items.variant.product.thumbnail');

            DB::commit();

            return $this->sendSuccess(
                $this->transformOrder($order->fresh()->load('items.variant.product.thumbnail')),
                'Thank you product added to order'
            );
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to add thank-you product to order', [
                'error' => $e->getMessage(),
            ]);
            return $this->sendError('Failed to add product. Please try again.', $e->getMessage(), 500);
        }
    }

    // -------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------

    /**
     * Find existing customer or create a new one.
     */
    private function resolveCustomer(array $data, $user = null): Customer
    {
        // Authenticated user — find linked customer
        if ($user) {
            $customer = Customer::where('user_id', $user->id)->first();
            if ($customer) {
                return $customer;
            }
        }

        // Find by phone
        $customer = Customer::where('phone', $data['customer_phone'])->first();
        if ($customer) {
            // Link to authenticated user if not already linked
            if ($user && !$customer->user_id) {
                $customer->update(['user_id' => $user->id]);
            }
            return $customer;
        }

        // Create new customer (bypasses $fillable restriction)
        $customer = new Customer();
        $customer->name = $data['customer_name'];
        $customer->phone = $data['customer_phone'];
        $customer->user_id = $user?->id;
        $customer->type = 'retail';
        $customer->save();

        return $customer;
    }

    /**
     * Get the effective price: use offer_price if active, otherwise regular price.
     */
    private function getEffectivePrice(ProductVariant $variant): float
    {
        if ($variant->offer_price > 0 && $variant->offer_price < $variant->price) {
            return (float) $variant->offer_price;
        }

        return (float) $variant->price;
    }

    /**
     * Resolve variant_id — fallback to first active retail variant if null.
     */
    private function resolveVariant(array $item): ProductVariant
    {
        if (!empty($item['variant_id'])) {
            return ProductVariant::where('id', $item['variant_id'])
                ->where('channel', 'retail')
                ->where('is_active', true)
                ->firstOrFail();
        }

        return ProductVariant::where('product_id', $item['product_id'])
            ->where('channel', 'retail')
            ->where('is_active', true)
            ->firstOrFail();
    }

    /**
     * Build shipping data array for external_data JSON field.
     */
    private function buildShippingData(array $validated): array
    {
        return [
            'shipping' => [
                'address'  => $validated['shipping_address'],
                'district' => $validated['shipping_district'] ?? null,
                'division' => $validated['shipping_division'] ?? null,
                'thana'    => $validated['shipping_thana'] ?? null,
            ],
            'customer' => [
                'name'  => $validated['customer_name'],
                'phone' => $validated['customer_phone'],
                'email' => $validated['customer_email'] ?? null,
            ],
            'payment' => [
                'method'  => $validated['payment_method'],
                'details' => $validated['payment_details'] ?? null,
            ],
        ];
    }

    /**
     * Transform a SalesOrder into a storefront-safe array.
     */
    private function transformOrder(SalesOrder $order): array
    {
        $shipping = $order->external_data['shipping'] ?? [];
        $customer = $order->external_data['customer'] ?? [];

        return [
            'id'             => $order->id,
            'orderNumber'    => $order->invoice_no,
            'status'         => $order->status,
            'paymentStatus'  => $order->payment_status,
            'subTotal'       => (float) $order->sub_total,
            'discountAmount' => (float) $order->discount_amount,
            'deliveryCharge' => (float) ($order->delivery_charge ?? 0),
            'totalAmount'    => (float) $order->total_amount,
            'paidAmount'     => (float) $order->paid_amount,
            'dueAmount'      => (float) $order->due_amount,
            'notes'          => $order->note,
            'shipping'       => [
                'address'  => $shipping['address'] ?? null,
                'city'     => $shipping['city'] ?? null,
                'district' => $shipping['district'] ?? null,
                'division' => $shipping['division'] ?? null,
                'thana'    => $shipping['thana'] ?? null,
            ],
            'customer'       => [
                'name'  => $customer['name'] ?? null,
                'phone' => $customer['phone'] ?? null,
                'email' => $customer['email'] ?? null,
            ],
            'items' => $order->items->map(fn($item) => [
                'id'            => $item->id,
                'variantId'     => $item->product_variant_id,
                'quantity'      => $item->quantity,
                'unitPrice'     => (float) $item->unit_price,
                'totalPrice'    => (float) $item->total_price,
                'productName'   => $item->variant?->product?->retail_name ?? $item->variant?->product?->name,
                'variantName'   => $item->variant?->variant_name,
                'sku'           => $item->variant?->sku,
                'image'         => $item->variant?->product?->thumbnail?->full_url,
            ])->values()->toArray(),
            'createdAt' => $order->created_at->toIso8601String(),
        ];
    }
}
