<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SalesOrder;
use App\Models\SalesOrderItem;
use App\Traits\ApiResponse;
use App\Services\Website\DeliveryChargeCalculator;
use App\Services\AlphaSmsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
            'customer_type'    => 'nullable|in:retail,wholesale',
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

            // Determine channel based on customer type
            $channel = $customer->type === 'wholesale' ? 'wholesale_web' : 'retail_web';

            $order = SalesOrder::create([
                'invoice_no'      => 'WEB-' . strtoupper(uniqid()),
                'customer_id'     => $customer->id,
                'channel'         => $channel,
                'status'          => 'pending',
                'payment_status'  => in_array($validated['payment_method'], ['cod', 'sslcommerz', 'eps']) ? 'unpaid' : 'paid',
                'sub_total'       => $validated['subtotal'],
                'discount_amount' => $validated['coupon_discount'] ?? 0,
                'delivery_charge' => $validated['delivery_charge'] ?? 0,
                'total_amount'    => $validated['payable_amount'],
                'paid_amount'     => in_array($validated['payment_method'], ['cod', 'sslcommerz', 'eps']) ? 0 : $validated['payable_amount'],
                'due_amount'      => in_array($validated['payment_method'], ['cod', 'sslcommerz', 'eps']) ? $validated['payable_amount'] : 0,
                'note'            => $validated['notes'] ?? null,
                'external_data'   => $this->buildShippingData($validated),
            ]);

            foreach ($validated['items'] as $item) {
                $variant = $this->resolveVariant($item);

                $unitPrice = $this->getEffectivePrice($variant);
                $originalPrice = (float) $variant->price;
                $quantity = (int) $item['quantity'];

                SalesOrderItem::create([
                    'sales_order_id'     => $order->id,
                    'product_variant_id' => $variant->id,
                    'quantity'           => $quantity,
                    'unit_price'         => $unitPrice,
                    'original_price'     => $originalPrice,
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
            $originalPrice = (float) $variant->price;
            $quantity = 1;

            SalesOrderItem::create([
                'sales_order_id'     => $order->id,
                'product_variant_id' => $variant->id,
                'quantity'           => $quantity,
                'unit_price'         => $unitPrice,
                'original_price'     => $originalPrice,
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

    /**
     * Calculate delivery charge based on weight and destination.
     * POST /api/v2/store/calculate-delivery
     */
    public function calculateDelivery(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'weight' => 'required|numeric|min:0',
            'division' => 'required|string|max:100',
            'order_amount' => 'nullable|numeric|min:0',
        ]);

        try {
            $weight = (float) $validated['weight'];
            $division = $validated['division'];
            $orderAmount = $validated['order_amount'] ?? null;

            $charge = DeliveryChargeCalculator::calculate($weight, $division);
            $breakdown = DeliveryChargeCalculator::breakdown($weight, $division);

            // Check if free delivery applies based on order amount
            $isFreeDelivery = false;
            if ($orderAmount !== null) {
                $isFreeDelivery = DeliveryChargeCalculator::isFreeDelivery(orderAmount: $orderAmount);
                if ($isFreeDelivery) {
                    $charge = 0;
                }
            }

            return $this->sendSuccess([
                'charge' => $charge,
                'breakdown' => [
                    'total_weight' => $breakdown['total_weight'],
                    'zone' => $breakdown['zone'],
                    'is_inside_dhaka' => $breakdown['is_inside_dhaka'],
                    'base_charge' => $breakdown['base_charge'],
                    'additional_kg' => $breakdown['additional_kg'],
                    'per_kg_rate' => $breakdown['per_kg_rate'],
                ],
                'is_free_delivery' => $isFreeDelivery,
            ], 'Delivery charge calculated successfully');

        } catch (\Exception $e) {
            \Log::error('Delivery charge calculation failed', [
                'error' => $e->getMessage(),
                'weight' => $validated['weight'] ?? null,
                'division' => $validated['division'] ?? null,
            ]);
            return $this->sendError('Failed to calculate delivery charge', $e->getMessage(), 500);
        }
    }

    /**
     * Get delivery settings for storefront (public access).
     * Returns rates and free delivery configuration.
     * GET /api/v2/public/delivery-settings
     */
    public function getDeliverySettings(): JsonResponse
    {
        try {
            $settings = \App\Services\Website\DeliveryChargeCalculator::getSettingsForAdmin();

            return $this->sendSuccess($settings, 'Delivery settings retrieved successfully');

        } catch (\Exception $e) {
            \Log::error('Failed to retrieve delivery settings', [
                'error' => $e->getMessage(),
            ]);

            return $this->sendError('Failed to retrieve delivery settings', $e->getMessage(), 500);
        }
    }

    // -------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------

    /**
     * Find existing customer/user or create new ones.
     * Creates both User and Customer if they don't exist.
     */
    private function resolveCustomer(array $data, $user = null): Customer
    {
        $phone = $data['customer_phone'];
        $name = $data['customer_name'];
        $customerType = $data['customer_type'] ?? 'retail';

        // Determine role based on customer type
        $roleSlug = $customerType === 'wholesale' ? 'wholesale_customer' : 'retail_customer';
        $role = \App\Models\Role::where('slug', $roleSlug)->first();

        // Authenticated user — find linked customer
        if ($user) {
            $customer = Customer::where('user_id', $user->id)->first();
            if ($customer) {
                return $customer;
            }
        }

        // Step 1: Find existing user by phone first
        $existingUser = \App\Models\User::where('phone', $phone)->first();

        if ($existingUser) {
            // User exists - find or create customer for this user
            $customer = Customer::where('user_id', $existingUser->id)->first();

            if (!$customer) {
                // Create customer linked to existing user
                $customer = new Customer();
                $customer->name = $name;
                $customer->phone = $phone;
                $customer->user_id = $existingUser->id;
                $customer->type = $customerType;
                $customer->save();
            }

            return $customer;
        }

        // Step 2: Find existing customer by phone (without user)
        $customer = Customer::where('phone', $phone)->first();

        if ($customer && $customer->user_id) {
            // Customer has a user account - return it
            return $customer;
        }

        // Step 3: Create new user and customer
        // Generate 8-digit numeric password
        $password = $this->generateNumericPassword(8);

        $newUser = \App\Models\User::create([
            'role_id' => $role?->id ?? 10, // Default to retail_customer role
            'name' => $name,
            'phone' => $phone,
            'email' => $data['customer_email'] ?? null,
            'password' => \Hash::make($password),
            'is_active' => true,
        ]);

        // Create customer linked to new user
        $customer = Customer::create([
            'name' => $name,
            'phone' => $phone,
            'user_id' => $newUser->id,
            'type' => $customerType,
        ]);

        // Send welcome SMS with login credentials
        $this->sendWelcomeSms($phone, $name, $password, $newUser->phone);

        return $customer;
    }

    /**
     * Generate numeric password of specified length
     */
    private function generateNumericPassword(int $length = 8): string
    {
        $password = '';
        for ($i = 0; $i < $length; $i++) {
            $password .= random_int(0, 9);
        }
        return $password;
    }

    /**
     * Send welcome SMS with login credentials
     */
    private function sendWelcomeSms(string $phone, string $name, string $password, string $loginPhone): void
    {
        try {
            $smsService = new AlphaSmsService();

            // Format phone for SMS (remove 88 prefix for display)
            $displayPhone = preg_replace('/^880/', '', $loginPhone);
            if (!str_starts_with($displayPhone, '01')) {
                $displayPhone = '0' . $displayPhone;
            }

            // Exactly 159 characters
            $message = "Welcome {$name} to HooknHunt! Your order has been placed. Track your order status at https://hooknhunt.com/account/orders Login: {$displayPhone} Password: {$password}";

            $smsService->sendSms($message, $phone);

            \Log::info('Welcome SMS sent', [
                'phone' => $phone,
                'name' => $name,
            ]);
        } catch (\Exception $e) {
            // Log error but don't fail the order
            \Log::error('Failed to send welcome SMS', [
                'phone' => $phone,
                'error' => $e->getMessage(),
            ]);
        }
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
                'originalPrice' => $item->original_price ? (float) $item->original_price : null,
                'totalPrice'    => (float) $item->total_price,
                'productName'   => $item->variant?->product?->retail_name ?? $item->variant?->product?->name,
                'variantName'   => $item->variant?->variant_name,
                'sku'           => $item->variant?->sku,
                // Variant thumbnail with fallback to product thumbnail
                'image'         => $item->variant?->thumbnail ?? $item->variant?->product?->thumbnail?->full_url,
            ])->values()->toArray(),
            'createdAt' => $order->created_at->toIso8601String(),
        ];
    }
}
