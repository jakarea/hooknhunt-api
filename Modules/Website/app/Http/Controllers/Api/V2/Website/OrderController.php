<?php

/* hooknhunt-api/Modules/Website/app/Http/Controllers/Api/V2/Website/OrderController.php */

namespace App\Modules\Website\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Modules\Website\Traits\ApiResponse;
use App\Traits\ImageHelper;
use App\Modules\Website\Http\Requests\PlaceOrderRequest;
use App\Modules\Website\Models\WebsiteOrder;
use App\Modules\Website\Models\WebsiteOrderItem;
use App\Services\AlphaSmsService;
use App\Modules\Website\Events\Order\OrderCreated;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class OrderController extends Controller
{
    use ApiResponse, ImageHelper;

    /**
     * Place a new order (guest or authenticated).
     *
     * @param PlaceOrderRequest $request
     * @return JsonResponse
     */
    public function placeOrder(PlaceOrderRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validatedWithDefaults();

            // Determine order channel
            $customerType = $validated['customer_type'] ?? 'retail';
            $channel = $customerType === 'wholesale'
                ? config('orders.channels.wholesale_web')
                : config('orders.channels.retail_web');

            // Get or create customer_id to satisfy database foreign key constraint
            $authUser = $request->user();
            $customerId = null;
            $userId = null; // Track user_id for address validation
            $credentials = null; // Initialize credentials for all order types
            $isReturningCustomer = false; // Track if this is a returning customer

            // Scenario 1: customer_id explicitly provided (returning customer)
            if (!empty($validated['customer_id'])) {
                $customerId = $validated['customer_id'];

                // Verify customer exists and get their details (module independence: direct DB query)
                $customer = DB::table('customers')->where('id', $customerId)->first();

                if (!$customer) {
                    return $this->sendError('Customer not found.', null, 404);
                }

                $isReturningCustomer = true;
                $userId = $customer->user_id; // Store user_id for address validation

                // Get customer's user for phone/email
                $user = DB::table('users')->where('id', $customer->user_id)->first(['name', 'phone', 'email']);
                $customerName = $customer->name;
                $customerPhone = $customer->phone;
                $customerEmail = $user->email ?? null;

            } elseif ($authUser) {
                $userId = $authUser->id; // Store user_id for address validation

                // Check if customer record exists for this user
                $customer = DB::table('customers')->where('user_id', $authUser->id)->first();

                if ($customer) {
                    $customerId = $customer->id;
                } else {
                    // Create customer record for authenticated user
                    $customerId = DB::table('customers')->insertGetId([
                        'user_id' => $authUser->id,
                        'currency_id' => 1, // Default currency
                        'name' => $authUser->name,
                        'phone' => $authUser->phone,
                        'type' => $customerType,
                        'wallet_balance' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                $customerName = $authUser->name;
                $customerPhone = $authUser->phone;
                $customerEmail = $authUser->email ?? null;

            } else {
                // For guest orders, implement auto account creation
                $generatedPassword = null;
                $isNewUser = false;

                // Check if user exists by phone (module independence: direct DB query)
                $existingUser = DB::table('users')
                    ->where('phone', $validated['customer_phone'])
                    ->first();

                if ($existingUser) {
                    // User exists - link to customer record
                    $existingCustomer = DB::table('customers')
                        ->where('user_id', $existingUser->id)
                        ->first();

                    if ($existingCustomer) {
                        $customerId = $existingCustomer->id;
                    } else {
                        // Create customer record linked to existing user
                        $customerId = DB::table('customers')->insertGetId([
                            'user_id' => $existingUser->id,
                            'currency_id' => 1,
                            'name' => $existingUser->name,
                            'phone' => $existingUser->phone,
                            'type' => $customerType,
                            'wallet_balance' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }

                    $userId = $existingUser->id;
                    $isReturningCustomer = true; // Existing guest user
                    $customerName = $existingUser->name;
                    $customerPhone = $existingUser->phone;
                    $customerEmail = $existingUser->email ?? null;
                } else {
                    // New guest user - create User account with auto-generated password
                    $generatedPassword = $this->generatePassword(); // Format: AB123456
                    $customerId = null;
                    $isNewUser = true;

                    // Create user account
                    $userId = DB::table('users')->insertGetId([
                        'name' => $validated['customer_name'],
                        'phone' => $validated['customer_phone'],
                        'email' => $validated['customer_email'] ?? null,
                        'password' => bcrypt($generatedPassword),
                        'role_id' => $customerType === 'wholesale' ? 11 : 10, // Retail customer = 10, Wholesale = 11
                        'is_active' => true,
                        'phone_verified_at' => now(), // Auto-verify since we have the phone from order
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Create customer record linked to new user
                    $customerId = DB::table('customers')->insertGetId([
                        'user_id' => $userId,
                        'currency_id' => 1,
                        'name' => $validated['customer_name'],
                        'phone' => $validated['customer_phone'],
                        'type' => $customerType,
                        'wallet_balance' => 0,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // Store credentials for API response (new user only)
                    $credentials = [
                        'phone' => $validated['customer_phone'],
                        'password' => $generatedPassword,
                    ];

                    $customerName = $validated['customer_name'];
                    $customerPhone = $validated['customer_phone'];
                    $customerEmail = $validated['customer_email'] ?? null;
                }

                // Send SMS with credentials only for new users
                if ($isNewUser && $generatedPassword) {
                    $this->sendAccountCreatedSms(
                        $validated['customer_phone'],
                        $generatedPassword,
                        null, // Will be set after order creation
                        $validated['customer_name']
                    );
                }
            }

            // Handle shipping address (saved address or new address)
            if (!empty($validated['shipping_address_id'])) {
                // Load saved address from addresses table (linked to user_id, not customer_id)
                $savedAddress = DB::table('addresses')
                    ->where('id', $validated['shipping_address_id'])
                    ->where('user_id', $userId) // Security: ensure address belongs to user
                    ->first();

                if (!$savedAddress) {
                    return $this->sendError('Saved address not found.', null, 404);
                }

                // Map address fields to order fields
                $shippingAddress = $savedAddress->address_line1;
                $shippingThana = $savedAddress->thana;
                $shippingDistrict = $savedAddress->city; // city maps to district
                $shippingDivision = $savedAddress->division;
            } else {
                // Use new address from form
                $shippingAddress = $validated['shipping_address'];
                $shippingThana = $validated['shipping_thana'] ?? null;
                $shippingDistrict = $validated['shipping_district'] ?? null;
                $shippingDivision = $validated['shipping_division'] ?? null;
            }

            // Determine payment status based on payment method
            $paidPaymentMethods = config('orders.paid_payment_methods') ?? [];
            $paymentStatus = in_array($validated['payment_method'], $paidPaymentMethods)
                ? config('orders.payment_status.paid')
                : config('orders.payment_status.unpaid');

            // Generate invoice number
            $invoicePrefix = config('orders.invoice_prefixes.' . $channel, 'WEB');
            $invoiceNo = $invoicePrefix . '-' . strtoupper(uniqid());

            // Create order using Website model with denormalized data
            $order = WebsiteOrder::create([
                'invoice_no' => $invoiceNo,
                'customer_id' => $customerId, // Valid customer_id from customers table
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $customerPhone,
                'shipping_name' => $customerName,
                'shipping_address' => $shippingAddress,
                'shipping_city' => $shippingDistrict,
                'shipping_country' => $shippingDivision,
                'shipping_thana' => $shippingThana,
                'channel' => $channel,
                'status' => config('orders.status.pending'),
                'payment_status' => $paymentStatus,
                'payment_method' => $validated['payment_method'],
                'sub_total' => $validated['subtotal'],
                'discount_amount' => $validated['coupon_discount'] ?? 0,
                'delivery_charge' => $validated['delivery_charge'] ?? 0,
                'total_amount' => $validated['payable_amount'],
                'paid_amount' => $paymentStatus === 'paid' ? $validated['payable_amount'] : 0,
                'due_amount' => $paymentStatus === 'paid' ? 0 : $validated['payable_amount'],
                'note' => $validated['notes'] ?? null,
                'external_data' => $this->buildShippingData($validated, $customerType),
                // Affiliate tracking fields
                'affiliate_referral_code' => $validated['affiliate_referral_code'] ?? null,
                'affiliate_referral_id' => $validated['affiliate_referral_id'] ?? null,
            ]);

            // Create order items
            foreach ($validated['items'] as $item) {
                $variantData = $this->fetchProductVariantDetails($item);

                $unitPrice = $variantData['price'];
                $originalPrice = $variantData['original_price'];
                $quantity = (int) $item['quantity'];

                WebsiteOrderItem::create([
                    'sales_order_id' => $order->id,
                    'product_variant_id' => $variantData['id'],
                    'product_name' => $variantData['product_name'],
                    'product_sku' => $variantData['sku'],
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'original_price' => $originalPrice,
                    'total_price' => $unitPrice * $quantity,
                    'total_cost' => $variantData['cost'] * $quantity,
                    'weight' => $variantData['weight'],
                ]);

                // Update inventory stock directly
                DB::table('product_variants')
                    ->where('id', $variantData['id'])
                    ->decrement('stock', $quantity);
            }

            DB::commit();

            Log::info('Order placed successfully', [
                'order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
                'customer_id' => $order->customer_id,
                'total_amount' => $order->total_amount,
                'channel' => $channel,
            ]);

            // Dispatch order created event (non-blocking)
            try {
                event(new OrderCreated($order));
            } catch (\Exception $eventException) {
                Log::warning('Failed to dispatch OrderCreated event', [
                    'order_id' => $order->id,
                    'error' => $eventException->getMessage()
                ]);
            }

            // Send order confirmation SMS (non-blocking)
            try {
                if (class_exists(AlphaSmsService::class)) {
                    $smsService = new AlphaSmsService();
                    $message = "Hook & Hunt: Your order {$order->invoice_no} has been placed successfully. Total: ৳{$order->total_amount}";
                    $smsService->sendSms($message, $order->customer_phone);
                }
            } catch (\Exception $smsException) {
                Log::warning('Failed to send order confirmation SMS', [
                    'order_id' => $order->id,
                    'error' => $smsException->getMessage()
                ]);
            }

            // Build response data with credentials for new users
            $response = $this->transformOrderResponse($order->load('items'));

            // Include credentials for newly created accounts
            if ($credentials) {
                $response['credentials'] = $credentials;
            }

            // Add returning customer flag
            $response['is_returning_customer'] = $isReturningCustomer;

            return $this->sendSuccess(
                $response,
                'Order placed successfully.',
                201
            );

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            Log::error('Database error during order placement', [
                'error' => $e->getMessage(),
                'sql' => $e->getSql(),
                'bindings' => $e->getBindings(),
            ]);
            return $this->sendError(
                'Failed to place order due to database error.',
                config('app.debug') ? ['error' => $e->getMessage()] : null,
                500
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Unexpected error during order placement', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['password', 'token']),
            ]);
            return $this->sendError(
                'Failed to place order. Please try again.',
                config('app.debug') ? ['error' => $e->getMessage()] : null,
                500
            );
        }
    }

    /**
     * Verify an order (e.g., payment confirmation).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function verifyOrder(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'order_id' => 'required|integer|exists:sales_orders,id',
                'payment_ref' => 'nullable|string|max:255',
                'gateway' => 'nullable|string|max:50',
                'status' => 'nullable|string|in:success,failed,cancelled',
            ]);

            $order = WebsiteOrder::find($validated['order_id']);

            if (!$order) {
                return $this->sendError('Order not found.', null, 404);
            }

            // Update order based on verification result
            if (isset($validated['status'])) {
                if ($validated['status'] === 'success') {
                    $order->update([
                        'status' => config('orders.status.confirmed'),
                        'payment_status' => config('orders.payment_status.paid'),
                        'paid_amount' => $order->due_amount,
                        'due_amount' => 0,
                    ]);
                } elseif ($validated['status'] === 'failed') {
                    $order->update([
                        'status' => config('orders.status.failed'),
                        'payment_status' => config('orders.payment_status.failed'),
                    ]);
                } elseif ($validated['status'] === 'cancelled') {
                    $order->update([
                        'status' => config('orders.status.cancelled'),
                        'payment_status' => config('orders.payment_status.cancelled'),
                    ]);
                }
            }

            // Store payment reference if provided
            if (isset($validated['payment_ref'])) {
                $order->update([
                    'transaction_id' => $validated['payment_ref']
                ]);
            }

            Log::info('Order verified', [
                'order_id' => $order->id,
                'invoice_no' => $order->invoice_no,
                'status' => $validated['status'] ?? 'verified',
            ]);

            return $this->sendSuccess(
                $order->load('items'),
                'Order verified successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error verifying order', [
                'order_id' => $request->order_id ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to verify order.',
                null,
                500
            );
        }
    }

    /**
     * Add thank you product to order.
     *
     * @param Request $request
     * @param string $invoiceNo
     * @return JsonResponse
     */
    public function addThankYouProduct(Request $request, string $invoiceNo): JsonResponse
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|integer|exists:products,id',
                'quantity' => 'nullable|integer|min:1|max:10',
            ]);

            $order = WebsiteOrder::where('invoice_no', $invoiceNo)->first();

            if (!$order) {
                return $this->sendError('Order not found.', null, 404);
            }

            $quantity = $validated['quantity'] ?? 1;

            // Get product with variant data
            $productData = DB::table('products')
                ->where('id', $validated['product_id'])
                ->first();

            if (!$productData) {
                return $this->sendError('Product not found.', null, 404);
            }

            // Get product's default variant (module independence: direct DB query)
            $variantData = DB::table('product_variants')
                ->where('product_id', $validated['product_id'])
                ->where('is_active', true)
                ->first();

            if (!$variantData) {
                return $this->sendError('Product has no active variants. Cannot add to order.', null, 400);
            }

            WebsiteOrderItem::create([
                'sales_order_id' => $order->id,
                'product_variant_id' => $variantData->id, // ✅ FIX: Use actual variant ID
                'product_name' => $productData->name,
                'product_sku' => $productData->sku ?? null,
                'quantity' => $quantity,
                'unit_price' => 0,
                'original_price' => 0,
                'total_price' => 0,
                'total_cost' => 0,
                'is_thank_you_product' => true,
            ]);

            Log::info('Thank you product added', [
                'order_id' => $order->id,
                'invoice_no' => $invoiceNo,
                'product_id' => $validated['product_id'],
                'quantity' => $quantity,
            ]);

            return $this->sendSuccess(
                null,
                'Thank you product added successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error adding thank you product', [
                'invoice_no' => $invoiceNo,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to add thank you product.',
                null,
                500
            );
        }
    }

    /**
     * Get customer's orders.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function myOrders(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return $this->sendError('Authentication required.', null, 401);
            }

            $perPage = min($request->input('per_page', 20), 100);

            // Find customer record for this user (customer_id != user_id in our system)
            $customer = DB::table('customers')->where('user_id', $user->id)->first();
            $customerId = $customer ? $customer->id : null;

            // If no customer record exists, return empty orders (security: prevent data leak)
            if (!$customerId) {
                Log::info('No customer record found for user, returning empty orders', [
                    'user_id' => $user->id,
                ]);

                return $this->sendSuccess([
                    'data' => [],
                    'total' => 0,
                    'per_page' => $perPage,
                    'current_page' => 1,
                    'last_page' => 1,
                ], 'No orders found for this account.');
            }

            $orders = WebsiteOrder::where('customer_id', $customerId)
                ->with('items')
                ->orderBy('created_at', 'desc')
                ->paginate($perPage);

            // Enhance order items with thumbnail data (pure function - no cross-module dependencies)
            $orders->getCollection()->transform(function ($order) {
                $order->items->transform(function ($item) {
                    // Add thumbnail using direct SQL join (module independence maintained)
                    $thumbnail = DB::table('sales_order_items as sgi')
                        ->leftJoin('product_variants as pv', 'sgi.product_variant_id', '=', 'pv.id')
                        ->leftJoin('products as p', 'pv.product_id', '=', 'p.id')
                        ->leftJoin('media_files as mf', 'p.thumbnail_id', '=', 'mf.id')
                        ->where('sgi.id', $item->id)
                        ->select(
                            'p.id as product_id',
                            'p.name as product_name',
                            'p.slug as product_slug',
                            'p.product_code as product_code',
                            'pv.sku as variant_sku',
                            'pv.variant_name',
                            'p.thumbnail_id as product_thumbnail_id',
                            'p.gallery_images',
                            'mf.id as thumbnail_id',
                            'mf.path as thumbnail_path',
                            'mf.url as thumbnail_url'
                        )
                        ->first();

                    // Format image URL using ImageHelper
                    $imageData = $this->formatProductImage(
                        $thumbnail ? $thumbnail->thumbnail_id : null,
                        $thumbnail ? $thumbnail->thumbnail_path : null,
                        $thumbnail ? $thumbnail->thumbnail_url : null
                    );

                    // Fallback to first gallery image if no thumbnail
                    if (!$imageData['image_url'] && $thumbnail && !$thumbnail->thumbnail_id && $thumbnail->gallery_images) {
                        $galleryIds = json_decode($thumbnail->gallery_images, true);
                        if (is_array($galleryIds) && !empty($galleryIds)) {
                            $firstGalleryImage = DB::table('media_files')
                                ->where('id', $galleryIds[0])
                                ->value('url');
                            if ($firstGalleryImage) {
                                $imageData['image_url'] = $firstGalleryImage;
                            }
                        }
                    }

                    $item->image_url = $imageData['image_url'];
                    $item->image_id = $imageData['image_id'];

                    // Add product and variant details from thumbnail query
                    if ($thumbnail) {
                        $item->product_name = $thumbnail->product_name;
                        $item->product_slug = $thumbnail->product_slug;
                        $item->product_code = $thumbnail->product_code;
                        $item->product_sku = $thumbnail->variant_sku;
                        $item->variant_name = $thumbnail->variant_name;
                    }

                    return $item;
                });

                return $order;
            });

            Log::info('Customer orders retrieved', [
                'user_id' => $user->id,
                'customer_id' => $customerId,
                'orders_count' => $orders->total(),
            ]);

            return $this->sendSuccess(
                $orders,
                'Orders retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving customer orders', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve orders.',
                null,
                500
            );
        }
    }

    /**
     * Get order summary.
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function orderSummary(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return $this->sendError('Authentication required.', null, 401);
            }

            // Find customer record for this user (customer_id != user_id in our system)
            $customer = DB::table('customers')->where('user_id', $user->id)->first();
            $customerId = $customer ? $customer->id : null;

            // If no customer record exists, return empty stats (security: prevent data leak)
            if (!$customerId) {
                $emptySummary = (object) [
                    'total_orders' => 0,
                    'total_spent' => 0,
                    'paid_amount' => 0,
                    'due_amount' => 0,
                    'pending_orders' => 0,
                    'completed_orders' => 0,
                    'recentOrders' => []
                ];

                Log::info('No customer record found for user, returning empty stats', [
                    'user_id' => $user->id,
                ]);

                return $this->sendSuccess(
                    $emptySummary,
                    'No orders found for this account.'
                );
            }

            // Get order summary statistics
            $summary = DB::table('sales_orders')
                ->where('customer_id', $customerId)
                ->selectRaw("
                    COUNT(*) as total_orders,
                    SUM(total_amount) as total_spent,
                    SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_amount,
                    SUM(CASE WHEN payment_status = 'unpaid' THEN total_amount ELSE 0 END) as due_amount,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed_orders
                ")
                ->first();

            // Get recent orders (last 5)
            $recentOrders = DB::table('sales_orders as so')
                ->where('customer_id', $customerId)
                ->orderBy('so.created_at', 'desc')
                ->limit(5)
                ->select([
                    'so.id',
                    'so.invoice_no as orderNumber',
                    'so.total_amount as totalAmount',
                    'so.status',
                    'so.created_at as createdAt'
                ])
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'orderNumber' => $order->orderNumber,
                        'totalAmount' => (float) $order->totalAmount,
                        'status' => $order->status,
                        'createdAt' => $order->createdAt,
                    ];
                });

            // Merge recent orders into summary
            $summaryArray = (array) $summary;
            $summaryArray['recentOrders'] = $recentOrders;
            $summary = (object) $summaryArray;

            Log::info('Order summary retrieved', [
                'user_id' => $user->id,
                'customer_id' => $customerId,
            ]);

            return $this->sendSuccess(
                $summary,
                'Order summary retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving order summary', [
                'user_id' => $request->user()?->id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve order summary.',
                null,
                500
            );
        }
    }

    /**
     * Show single order by invoice number.
     *
     * @param string $invoiceNo
     * @return JsonResponse
     */
    public function show(string $invoiceNo): JsonResponse
    {
        try {
            $order = WebsiteOrder::with('items')
                ->where('invoice_no', $invoiceNo)
                ->first();

            if (!$order) {
                return $this->sendError('Order not found.', null, 404);
            }

            // Check if user owns this order
            if (auth()->check()) {
                // Get customer record for this user
                $customer = DB::table('customers')->where('user_id', auth()->id())->first();
                $customerId = $customer ? $customer->id : null;

                // Check if order belongs to this customer or user is admin
                if ($order->customer_id !== $customerId) {
                    $userRole = auth()->user()->role_id;
                    $adminRoles = [
                        config('roles.staff.super_admin_id'),
                        config('roles.staff.admin_id'),
                    ];

                    if (!in_array($userRole, $adminRoles)) {
                        return $this->sendError(
                            'You do not have permission to view this order.',
                            null,
                            403
                        );
                    }
                }
            }

            Log::info('Order details retrieved', [
                'order_id' => $order->id,
                'invoice_no' => $invoiceNo,
                'requested_by' => auth()->id(),
            ]);

            return $this->sendSuccess(
                $this->transformOrderResponse($order),
                'Order retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving order details', [
                'invoice_no' => $invoiceNo,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve order details.',
                null,
                500
            );
        }
    }

    /**
     * Track order by phone or email (guest order tracking)
     * GET /api/v2/store/orders/track?phone=01712345678&email=test@example.com
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function trackOrder(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'phone' => 'nullable|string|min:11|max:15',
                'email' => 'nullable|email',
            ]);

            if (empty($validated['phone']) && empty($validated['email'])) {
                return $this->sendError(
                    'Please provide phone number or email to track your order.',
                    null,
                    400
                );
            }

            // Build query to find orders by phone or email (module independence: use denormalized columns)
            $query = WebsiteOrder::query();

            if (!empty($validated['phone'])) {
                $query->where('customer_phone', $validated['phone']);
            }

            if (!empty($validated['email'])) {
                $query->orWhere('customer_email', $validated['email']);
            }

            $orders = $query->with('items')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            if ($orders->isEmpty()) {
                return $this->sendError(
                    'No orders found. Please check your phone number/email and try again.',
                    null,
                    404
                );
            }

            // Transform orders for response
            $ordersData = $orders->map(function ($order) {
                return [
                    'id' => $order->id,
                    'invoice_no' => $order->invoice_no,
                    'status' => $order->status,
                    'status_label' => $order->status_label,
                    'payment_status' => $order->payment_status,
                    'total_amount' => (float) $order->total_amount,
                    'created_at' => $order->created_at?->toIso8601String(),
                    'items_count' => $order->items->count(),
                ];
            });

            return $this->sendSuccess(
                [
                    'orders' => $ordersData,
                    'total_found' => $orders->count(),
                    'search_by' => [
                        'phone' => $validated['phone'] ?? null,
                        'email' => $validated['email'] ?? null,
                    ],
                ],
                'Orders found successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error tracking order', [
                'phone' => $request->phone ?? null,
                'email' => $request->email ?? null,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to track order. Please try again later.',
                null,
                500
            );
        }
    }

    /**
     * Fetch product variant details from database.
     *
     * @param array $item
     * @return array
     */
    protected function fetchProductVariantDetails(array $item): array
    {
        $variantId = $item['variant_id'] ?? null;

        if ($variantId) {
            return (array) DB::table('product_variants as pv')
                ->join('products as p', 'pv.product_id', '=', 'p.id')
                ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
                ->where('pv.id', $variantId)
                ->select(
                    'pv.id',
                    'pv.sku',
                    'pv.price',
                    'pv.offer_price as original_price',
                    'pv.purchase_cost as cost',
                    'pv.weight',
                    'pv.stock',
                    'p.name as product_name',
                    'm.path as thumbnail_path'
                )
                ->first();
        }

        // Fetch first active variant if no variant specified
        return (array) DB::table('product_variants as pv')
            ->join('products as p', 'pv.product_id', '=', 'p.id')
            ->leftJoin('media_files as m', 'p.thumbnail_id', '=', 'm.id')
            ->where('p.id', $item['product_id'])
            ->where('pv.is_active', true)
            ->orderBy('pv.id', 'asc')
            ->select(
                'pv.id',
                'pv.sku',
                'pv.price',
                'pv.offer_price as original_price',
                'pv.purchase_cost as cost',
                'pv.weight',
                'pv.stock',
                'p.name as product_name',
                'm.path as thumbnail_path'
            )
            ->first();
    }

    /**
     * Build shipping data for external_data field.
     *
     * @param array $validated
     * @param string $customerType
     * @return array
     */
    protected function buildShippingData(array $validated, string $customerType = 'retail'): array
    {
        return [
            'shipping_district' => $validated['shipping_district'] ?? null,
            'shipping_division' => $validated['shipping_division'] ?? null,
            'shipping_thana' => $validated['shipping_thana'] ?? null,
            'customer_type' => $customerType,
        ];
    }

    /**
     * Transform order for API response.
     *
     * @param WebsiteOrder $order
     * @return array
     */
    protected function transformOrderResponse(WebsiteOrder $order): array
    {
        $orderArray = $order->toArray();

        // Add computed fields
        $orderArray['status_display'] = ucfirst(str_replace('_', ' ', $order->status));
        $orderArray['payment_status_display'] = ucfirst(str_replace('_', ' ', $order->payment_status));

        // Create customer object for frontend
        $orderArray['customer'] = [
            'name' => $order->customer_name,
            'phone' => $order->customer_phone,
            'email' => $order->customer_email,
        ];

        // Create shipping object from external_data or denormalized fields
        $externalData = is_array($order->external_data) ? $order->external_data : json_decode($order->external_data, true);
        $shippingData = $externalData['shipping'] ?? [];

        $orderArray['shipping'] = [
            'address' => $order->shipping_address ?? $shippingData['address'] ?? '',
            'city' => $order->shipping_city ?? $shippingData['city'] ?? null,
            'district' => $order->shipping_city ?? $shippingData['district'] ?? '',
            'division' => $order->shipping_country ?? $shippingData['division'] ?? '',
            'thana' => $order->shipping_thana ?? $shippingData['thana'] ?? '',
        ];

        // Transform items - add thumbnail data using SQL join (same approach as myOrders)
        if (isset($orderArray['items'])) {
            $orderArray['items'] = collect($orderArray['items'])->map(function ($item) {
                $item['total_price_formatted'] = number_format($item['total_price'], 2);

                // Add thumbnail, product info, and variant details using direct SQL join (module independence maintained)
                $thumbnail = DB::table('sales_order_items as sgi')
                    ->leftJoin('product_variants as pv', 'sgi.product_variant_id', '=', 'pv.id')
                    ->leftJoin('products as p', 'pv.product_id', '=', 'p.id')
                    ->leftJoin('media_files as mf', 'p.thumbnail_id', '=', 'mf.id')
                    ->where('sgi.id', $item['id'])
                    ->select(
                        'p.id as product_id',
                        'p.name as product_name',
                        'p.slug as product_slug',
                        'p.product_code as product_code',
                        'pv.sku as variant_sku',
                        'pv.variant_name',
                        'p.thumbnail_id as product_thumbnail_id',
                        'p.gallery_images',
                        'mf.id as thumbnail_id',
                        'mf.path as thumbnail_path',
                        'mf.url as thumbnail_url'
                    )
                    ->first();

                // Format image URL using ImageHelper
                $imageData = $this->formatProductImage(
                    $thumbnail ? $thumbnail->thumbnail_id : null,
                    $thumbnail ? $thumbnail->thumbnail_path : null,
                    $thumbnail ? $thumbnail->thumbnail_url : null
                );

                // Fallback to first gallery image if no thumbnail
                if (!$imageData['image_url'] && $thumbnail && !$thumbnail->thumbnail_id && $thumbnail->gallery_images) {
                    $galleryIds = json_decode($thumbnail->gallery_images, true);
                    if (is_array($galleryIds) && !empty($galleryIds)) {
                        $firstGalleryImage = DB::table('media_files')
                            ->where('id', $galleryIds[0])
                            ->value('url');
                        if ($firstGalleryImage) {
                            $imageData['image_url'] = $firstGalleryImage;
                        }
                    }
                }

                $item['imageUrl'] = $imageData['image_url'];
                $item['image_url'] = $imageData['image_url'];
                $item['image_id'] = $imageData['image_id'];

                // Add product and variant details from thumbnail query
                if ($thumbnail) {
                    $item['product_name'] = $thumbnail->product_name;
                    $item['product_slug'] = $thumbnail->product_slug;
                    $item['product_code'] = $thumbnail->product_code;
                    $item['product_sku'] = $thumbnail->variant_sku;
                    $item['variant_name'] = $thumbnail->variant_name;
                }

                return $item;
            })->toArray();
        }

        return $orderArray;
    }

    /**
     * Generate random password for new customer accounts
     * Format: 2 uppercase letters + 6 digits (e.g., AB123456)
     *
     * @return string Generated password
     */
    protected function generatePassword(): string
    {
        // 2 uppercase letters (A-Z)
        $letters = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 0, 2));

        // 6 digits (0-9), left-padded with zeros
        $numbers = str_pad((string) rand(100000, 999999), 6, '0', STR_PAD_LEFT);

        return $letters . $numbers; // e.g., "AB123456"
    }

    /**
     * Send account creation SMS with credentials
     *
     * @param string $phone Customer phone number
     * @param string $password Generated password
     * @param string|null $invoiceNo Order invoice number
     * @param string $customerName Customer name
     * @return void
     */
    protected function sendAccountCreatedSms(string $phone, string $password, ?string $invoiceNo = null, string $customerName = 'Customer'): void
    {
        try {
            if (class_exists(AlphaSmsService::class)) {
                $smsService = new AlphaSmsService();

                $message = "Thank you for shopping with Hook & Hunt!\n";
                $message .= "Order Received: {$invoiceNo}\n";
                $message .= "Login to track anytime with Phone: {$phone} | Pass: {$password}";

                $smsService->sendSms($message, $phone);

                Log::info('Account creation SMS sent successfully', [
                    'phone' => $phone,
                    'customer_name' => $customerName,
                    'invoice_no' => $invoiceNo,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to send account creation SMS', [
                'phone' => $phone,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
        }
    }
}
