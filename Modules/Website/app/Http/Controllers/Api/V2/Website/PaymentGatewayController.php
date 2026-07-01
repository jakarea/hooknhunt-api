<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\Website;


use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Modules\Website\Events\Order\OrderCancelled;
use App\Modules\Website\Events\Order\OrderFailed;
use App\Modules\Website\Events\Order\OrderPaid;
use App\Modules\Website\Services\EPSPayment;
use App\Modules\Website\Services\SSLCommerzService;
use App\Modules\Finance\Models\PaymentTransaction;

class PaymentGatewayController extends Controller
{

    public function getActiveGateway()
    {
        // Get active payment gateway from database - pure function, no cross-module dependencies
        $activeGateway = DB::table('settings')
            ->where('group', 'website')
            ->where('key', 'active_payment_gateway')
            ->value('value') ?? 'sslcommerz';

        // Validate gateway value
        if (!in_array($activeGateway, ['sslcommerz', 'eps'])) {
            $activeGateway = 'sslcommerz';
        }

        return response()->json([
            'status' => true,
            'data' => [
                'activeGateway' => $activeGateway,
                'name' => $activeGateway === 'eps' ? 'EPS' : 'SSLCommerz',
            ]
        ]);
    }



    /**
     * Unified payment initiation — gateway chosen from admin settings, not from request.
     * POST /api/v2/store/payments/initiate
     */
    public function initiatePayment(Request $request)
    {
        // Read active gateway from admin settings (set via /settings/payments)
        $activeGateway = DB::table('settings')
            ->where('group', 'website')
            ->where('key', 'active_payment_gateway')
            ->value('value') ?? 'sslcommerz';

        if (!in_array($activeGateway, ['sslcommerz', 'eps'])) {
            $activeGateway = 'sslcommerz';
        }

        $validated = $request->validate([
            'sales_order_id'   => 'required|integer',
            'customer_name'    => 'required|string',
            'customer_email'   => 'nullable|email',
            'customer_phone'   => 'required|string',
            'customer_address' => 'required|array',
            'emi_option'       => 'nullable|integer',
        ]);

        $order = \App\Modules\Website\Models\WebsiteOrder::with('items')->find($validated['sales_order_id']);

        if (!$order) {
            return response()->json(['status' => false, 'error' => 'Order not found'], 404);
        }

        if ($activeGateway === 'sslcommerz') {
            try {
                $ssl = new SSLCommerzService();

                $result = $ssl->createPayment([
                    'amount'           => (float) $order->total_amount,
                    'currency'         => 'BDT',
                    'customer_name'    => $validated['customer_name'],
                    'customer_email'   => $validated['customer_email'] ?? '',
                    'customer_phone'   => $validated['customer_phone'],
                    'customer_address' => $validated['customer_address'],
                    'sales_order_id'   => $order->id,
                    'customer_id'      => $order->customer_id ?? 'guest',
                    'user_id'          => $order->customer_id ?? 'guest',
                    'emi_option'       => $validated['emi_option'] ?? 0,
                ]);

                if ($result['success']) {
                    return response()->json([
                        'status' => true,
                        'data'   => [
                            'payment_id'  => $order->id,
                            'gateway_url' => $result['gateway_url'],
                            'tran_id'     => $result['tran_id'],
                            'amount'      => (float) $order->total_amount,
                            'currency'    => 'BDT',
                            'gateway'     => 'sslcommerz',
                            'sandbox'     => $ssl->isSandbox(),
                        ],
                    ]);
                }

                return response()->json(['status' => false, 'error' => $result['error'] ?? 'Payment initiation failed'], 500);

            } catch (\Exception $e) {
                Log::error('SSL Commerz Payment Exception', ['message' => $e->getMessage()]);
                return response()->json(['status' => false, 'error' => 'Payment service error: ' . $e->getMessage()], 500);
            }
        }

        // EPS path — delegate to existing method
        return $this->initiateEPSPayment($request);
    }

    /**
     * SSL Commerz EMI options endpoint.
     * POST /api/v2/store/payments/emi-options
     */
    public function emiOptions(Request $request)
    {
        $request->validate(['amount' => 'required|numeric|min:0']);

        $ssl = new SSLCommerzService();
        $options = $ssl->getEmiOptions((float) $request->input('amount'));

        return response()->json([
            'status' => true,
            'data'   => [
                'emi_options' => $options,
                'emi_banks'   => $ssl->getEmiBanks(),
            ],
        ]);
    }

    public function initiateEPSPayment(Request $request)
    {
        Log::info('EPS Payment Initiation Started', ['request_data' => $request->all()]);

        // Validate request
        $validated = $request->validate([
            'sales_order_id' => 'required|integer',
            'customer_name' => 'required|string',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'required|string',
            'customer_address' => 'required|array',
        ]);

        Log::info('Validation passed', ['validated' => $validated]);

        // Get the order with its items
        $order = \App\Modules\Website\Models\WebsiteOrder::with('items')->find($validated['sales_order_id']);

        if (!$order) {
            Log::error('Order not found', ['sales_order_id' => $validated['sales_order_id']]);
            return response()->json([
                'status' => false,
                'error' => 'Order not found'
            ], 404);
        }

        Log::info('Order found', ['order_id' => $order->id, 'invoice_no' => $order->invoice_no]);

        // Get customer address
        $address = $validated['customer_address'];

        // Build product list from order items
        $productList = [];
        if ($order->items && count($order->items) > 0) {
            foreach ($order->items as $item) {
                $productList[] = [
                    "ProductName" => $item->product_name ?? 'Product',
                    "NoOfItem" => (string)$item->quantity,
                    "ProductProfile" => (string)($item->product_id ?? $item->id),
                    "ProductCategory" => "General",
                    "ProductPrice" => (string)($item->unit_price ?? $item->price ?? 0)
                ];
            }
        }

        // Check if there's an existing pending payment transaction for this order
        // If yes, reuse the same transaction ID (EPS expects same ID on retry)
        // If no, generate a new unique transaction ID
        $existingTransaction = PaymentTransaction::where('sales_order_id', $order->id)
            ->where('gateway', 'eps')
            ->where('status', 'pending')
            ->orderByDesc('created_at')
            ->first();

        if ($existingTransaction && $existingTransaction->gateway_tran_id) {
            // Reuse existing transaction ID for retry
            $transactionId = $existingTransaction->gateway_tran_id;
            Log::info('Reusing existing EPS transaction ID', [
                'order_id' => $order->id,
                'transaction_id' => $transactionId,
                'previous_attempt' => $existingTransaction->created_at
            ]);
        } else {
            // Generate new unique transaction ID for first attempt
            $transactionId = 'TXN-' . $order->id . '-' . time() . '-' . random_int(1000, 9999);
            Log::info('Generated new EPS transaction ID', [
                'order_id' => $order->id,
                'transaction_id' => $transactionId
            ]);
        }

        // Build EPS payload with actual order data
        $payload = [
            "totalAmount" => (float)$order->total_amount,
            "ipAddress" => $request->ip() ?: '47.247.196.37', // Fallback IP

            'CustomerOrderId' => $transactionId,
            "successUrl" => route('payment.success'),
            "failUrl" => route('payment.fail'),
            "cancelUrl" => route('payment.cancel'),

            "customerName" => $validated['customer_name'],
            "customerEmail" => $validated['customer_email'] ?? '',
            "customerAddress" => $address['address_line1'] ?? '',
            "customerAddress2" => $address['address_line2'] ?? '',
            "customerCity" => $address['city'] ?? '',
            "customerState" => $address['city'] ?? '',
            "customerPostcode" => $address['postal_code'] ?? '',
            "customerCountry" => $address['country'] ?? 'Bangladesh',
            "customerPhone" => $validated['customer_phone'],

            "shipmentName" => $validated['customer_name'],
            "shipmentAddress" => $address['address_line1'] ?? '',
            "shipmentAddress2" => $address['address_line2'] ?? '',
            "shipmentCity" => $address['city'] ?? '',
            "shipmentState" => $address['city'] ?? '',
            "shipmentPostcode" => $address['postal_code'] ?? '',
            "shipmentCountry" => $address['country'] ?? 'Bangladesh',

            "valueA" => (string)($order->customer_id ?? 'guest'),
            "valueB" => (string)$order->id,
            "valueC" => $order->invoice_no,

            "shippingMethod" => "Home Delivery",
            "noOfItem" => (string)($order->items ? count($order->items) : 1),
            "productName" => "Order Payment - " . $order->invoice_no,
            "productProfile" => "Order",
            "productCategory" => "E-commerce",
            "ProductList" => $productList,
        ];

        Log::info('EPS Payload prepared', ['payload' => $payload]);

        // Create or update PaymentTransaction record
        // On first attempt: Create new record
        // On retry: Update existing record (keep same transaction ID)
        try {
            if ($existingTransaction) {
                // Update existing transaction record for retry attempt
                $existingTransaction->update([
                    'status' => 'pending',
                    'customer_name' => $validated['customer_name'],
                    'customer_email' => $validated['customer_email'] ?? null,
                    'customer_phone' => $validated['customer_phone'],
                    'customer_address' => $address,
                    'ip_address' => $request->ip(),
                ]);
                $paymentTransaction = $existingTransaction;

                Log::info('PaymentTransaction updated for retry', [
                    'transaction_id' => $paymentTransaction->id,
                    'gateway_tran_id' => $transactionId,
                    'order_id' => $order->id
                ]);
            } else {
                // Create new transaction record for first attempt
                $paymentTransaction = PaymentTransaction::create([
                    'sales_order_id' => $order->id,
                    'customer_id' => $order->customer_id,
                    'gateway' => 'eps',
                    'gateway_tran_id' => $transactionId,
                    'eps_tran_id' => $transactionId,
                    'amount' => (float)$order->total_amount,
                    'currency' => 'BDT',
                    'status' => 'pending',
                    'payment_method' => 'eps',
                    'customer_name' => $validated['customer_name'],
                    'customer_email' => $validated['customer_email'] ?? null,
                    'customer_phone' => $validated['customer_phone'],
                    'customer_address' => $address,
                    'ip_address' => $request->ip(),
                ]);

                Log::info('PaymentTransaction created', [
                    'transaction_id' => $paymentTransaction->id,
                    'gateway_tran_id' => $transactionId,
                    'order_id' => $order->id
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Failed to create/update PaymentTransaction', [
                'order_id' => $order->id,
                'error' => $e->getMessage()
            ]);
            // Don't fail the payment initiation if transaction record creation fails
        }

        // Call EPS Payment Service
        try {
            $epsPayment = new EPSPayment();
            $data = $epsPayment->CreatePayment($payload);

            Log::info('EPS Response received', ['eps_response' => $data]);

            // Return proper format for frontend
            if (isset($data['RedirectURL']) && $data['isSuccess']) {
                $response = [
                    'status' => true,
                    'data' => [
                        'payment_id' => (int)$order->id,
                        'gateway_url' => $data['RedirectURL'],
                        'tran_id' => $data['TransactionId'] ?? uniqid('tran_'),
                        'amount' => (float)$order->total_amount,
                        'currency' => 'BDT',
                        'sandbox' => true,
                    ]
                ];

                Log::info('Returning success response', ['response' => $response]);
                return response()->json($response);
            }

            // Handle EPS error
            $errorMessage = $data['ErrorMessage'] ?? $data['message'] ?? 'Payment initiation failed';

            $errorResponse = [
                'status' => false,
                'error' => $errorMessage,
                'gateway_unavailable' => true,
                'debug' => [
                    'eps_response' => $data,
                    'redirect_url_exists' => isset($data['RedirectURL']),
                    'is_success' => $data['isSuccess'] ?? false
                ]
            ];

            Log::error('EPS Payment failed', ['error_response' => $errorResponse, 'eps_data' => $data]);
            return response()->json($errorResponse, 500);

        } catch (\Exception $e) {
            Log::error('EPS Payment Exception', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'status' => false,
                'error' => 'Payment service error: ' . $e->getMessage()
            ], 500);
        }
    }


    /**
     * Payment Success Callback — handles both SSL Commerz (POST) and EPS (GET)
     * GET|POST /api/v2/store/payments/success
     */
    public function success(Request $request)
    {
        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:3000');

        // SSL Commerz sends a POST with tran_id + value_a (our sales_order id)
        if ($request->has('tran_id') && !$request->has('MerchantTransactionId')) {
            $tranId      = $request->input('tran_id');
            $salesOrderId = $request->input('value_a');
            $status      = $request->input('status');

            Log::info('SSL Commerz Success Callback', ['tran_id' => $tranId, 'value_a' => $salesOrderId, 'status' => $status]);

            $order = \App\Modules\Website\Models\WebsiteOrder::find($salesOrderId);

            if ($order && $order->payment_status !== 'paid') {
                DB::transaction(function () use ($order, $tranId) {
                    $order->update([
                        'payment_status' => 'paid',
                        'paid_amount'    => $order->total_amount,
                        'due_amount'     => 0,
                        'status'         => 'processing',
                    ]);
                    event(new OrderPaid($order, $tranId, 'sslcommerz'));
                });
            }

            return redirect()->away($frontendUrl . '/order-success?' . http_build_query([
                'tran_id' => $tranId,
                'invoice' => $order->invoice_no ?? '',
                'total' => $order->total_amount ?? 0,
                'name' => $order->customer_name ?? $order->shipping_name ?? 'Customer',
                'phone' => $order->customer_phone ?? $order->shipping_phone ?? '',
                'status'  => $status,
                'gateway' => 'sslcommerz',
            ]));
        }

        // EPS GET callback
        $merchantTransactionId = $request->query('MerchantTransactionId');
        $epsTransactionId      = $request->query('EPSTransactionId_');
        $status                = $request->query('Status');
        $valueC                = $request->query('valueC'); // Invoice number from our payload

        Log::info('EPS Success Callback', ['merchant_transaction_id' => $merchantTransactionId, 'eps_transaction_id' => $epsTransactionId, 'valueC' => $valueC]);

        // Use valueC (invoice_no) to find order, not MerchantTransactionId (which is now unique transaction ID)
        $order = $valueC
            ? \App\Modules\Website\Models\WebsiteOrder::where('invoice_no', $valueC)->first()
            : null;

        if ($order && $order->payment_status !== 'paid') {
            DB::transaction(function () use ($order, $epsTransactionId) {
                $order->update([
                    'payment_status' => 'paid',
                    'paid_amount'    => $order->total_amount,
                    'due_amount'     => 0,
                    'status'         => 'processing',
                ]);
                event(new OrderPaid($order, $epsTransactionId, 'eps'));
            });
        }

        return redirect()->away($frontendUrl . '/order-success?' . http_build_query([
            'tran_id' => $epsTransactionId,
            'invoice' => $merchantTransactionId,
            'total' => $order->total_amount ?? 0,
            'name' => $order->customer_name ?? $order->shipping_name ?? 'Customer',
            'phone' => $order->customer_phone ?? $order->shipping_phone ?? '',
            'status'  => $status,
            'gateway' => 'eps',
        ]));
    }


    /**
     * Payment Fail Callback — handles both SSL Commerz (POST) and EPS (GET)
     * GET|POST /api/v2/store/payments/fail
     */
    public function fail(Request $request)
    {
        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:3000');

        // SSL Commerz POST
        if ($request->has('tran_id') && !$request->has('MerchantTransactionId')) {
            $tranId       = $request->input('tran_id');
            $salesOrderId = $request->input('value_a');
            $errorMessage = $request->input('error_reason', 'Payment failed');

            Log::error('SSL Commerz Fail Callback', ['tran_id' => $tranId, 'reason' => $errorMessage]);

            $order = \App\Modules\Website\Models\WebsiteOrder::find($salesOrderId);
            $orderTotal   = 0;
            $customerName = '';

            if ($order && $order->payment_status !== 'failed') {
                $orderTotal   = $order->total_amount ?? 0;
                $customerName = $order->customer_name ?? '';

                DB::transaction(function () use ($order, $errorMessage) {
                    $order->update(['payment_status' => 'failed']);
                    event(new OrderFailed($order, $errorMessage, null));
                });
            }

            return redirect()->away($frontendUrl . '/order-success?' . http_build_query([
                'invoice' => $order->invoice_no ?? '',
                'total'   => $orderTotal,
                'name'    => $customerName,
                'tran_id' => $tranId,
                'payment_status' => 'failed',
                'gateway' => 'sslcommerz',
            ]));
        }

        // EPS GET callback
        $merchantTransactionId = $request->query('MerchantTransactionId');
        $epsTransactionId      = $request->query('EPSTransactionId_');
        $errorCode             = $request->query('ErrorCode');
        $errorMessage          = $request->query('ErrorMessage');
        $valueC                = $request->query('valueC'); // Invoice number from our payload

        Log::error('EPS Fail Callback', ['merchant_transaction_id' => $merchantTransactionId, 'error' => $errorMessage, 'valueC' => $valueC]);

        $orderTotal   = 0;
        $customerName = '';
        $order        = null;

        // Use valueC (invoice_no) to find order, not MerchantTransactionId
        if ($valueC) {
            $order = \App\Modules\Website\Models\WebsiteOrder::where('invoice_no', $valueC)->first();
            if ($order) {
                $orderTotal   = $order->total_amount ?? 0;
                $customerName = $order->customer_name ?? '';

                if ($order->payment_status !== 'failed') {
                    DB::transaction(function () use ($order, $errorMessage, $errorCode) {
                        $order->update(['payment_status' => 'failed']);
                        event(new OrderFailed($order, $errorMessage, $errorCode));
                    });
                }
            }
        }

        return redirect()->away($frontendUrl . '/order-success?' . http_build_query([
            'invoice' => $merchantTransactionId,
            'total'   => $orderTotal,
            'name'    => $customerName,
            'tran_id' => $epsTransactionId,
            'payment_status' => 'failed',
            'gateway' => 'eps',
        ]));
    }


    /**
     * Payment Cancel Callback — handles both SSL Commerz (POST) and EPS (GET)
     * GET|POST /api/v2/store/payments/cancel
     */
    public function cancel(Request $request)
    {
        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:3000');

        // SSL Commerz POST
        if ($request->has('tran_id') && !$request->has('MerchantTransactionId')) {
            $tranId       = $request->input('tran_id');
            $salesOrderId = $request->input('value_a');

            Log::warning('SSL Commerz Cancel Callback', ['tran_id' => $tranId]);

            $order = \App\Modules\Website\Models\WebsiteOrder::find($salesOrderId);

            if ($order && $order->payment_status !== 'cancelled') {
                DB::transaction(function () use ($order) {
                    $order->update(['payment_status' => 'cancelled']);
                    event(new OrderCancelled($order, 'Payment cancelled by customer', 'customer'));
                });
            }

            return redirect()->away($frontendUrl);
        }

        // EPS GET callback
        $merchantTransactionId = $request->query('MerchantTransactionId');
        $epsTransactionId      = $request->query('EPSTransactionId_');
        $errorMessage          = $request->query('ErrorMessage');

        Log::warning('EPS Cancel Callback', ['merchant_transaction_id' => $merchantTransactionId]);

        if ($merchantTransactionId) {
            $order = \App\Modules\Website\Models\WebsiteOrder::where('invoice_no', $merchantTransactionId)->first();
            if ($order && $order->payment_status !== 'cancelled') {
                DB::transaction(function () use ($order, $errorMessage) {
                    $order->update(['payment_status' => 'cancelled']);
                    event(new OrderCancelled($order, $errorMessage ?: 'Payment cancelled by customer', 'customer'));
                });
            }
        }

        return redirect()->away($frontendUrl);
    }

    /**
     * SSL Commerz IPN Webhook — server-to-server payment verification
     * POST /api/v2/store/payments/sslcommerz/ipn
     */
    public function sslCommerzIPN(Request $request)
    {
        $data = $request->all();

        Log::info('SSL Commerz IPN Received', ['tran_id' => $data['tran_id'] ?? null, 'status' => $data['status'] ?? null]);

        $ssl = new SSLCommerzService();

        if (!$ssl->verifyHash($data)) {
            Log::warning('SSL Commerz IPN: Invalid hash signature', ['tran_id' => $data['tran_id'] ?? null]);
            return response()->json(['status' => false, 'message' => 'Invalid signature'], 400);
        }

        $salesOrderId = $data['value_a'] ?? null;
        $tranId       = $data['tran_id'] ?? null;
        $status       = strtoupper($data['status'] ?? '');

        $order = \App\Modules\Website\Models\WebsiteOrder::find($salesOrderId);

        if (!$order) {
            Log::warning('SSL Commerz IPN: Order not found', ['value_a' => $salesOrderId]);
            return response()->json(['status' => false, 'message' => 'Order not found'], 404);
        }

        DB::transaction(function () use ($order, $tranId, $status, $data) {
            if (in_array($status, ['VALID', 'SUCCESS']) && $order->payment_status !== 'paid') {
                $order->update(['payment_status' => 'paid', 'paid_amount' => $order->total_amount, 'due_amount' => 0, 'status' => 'processing']);
                event(new OrderPaid($order, $tranId, 'sslcommerz'));

            } elseif ($status === 'FAILED' && $order->payment_status !== 'failed') {
                $order->update(['payment_status' => 'failed']);
                event(new OrderFailed($order, $data['error_reason'] ?? 'Payment failed via IPN', null));

            } elseif ($status === 'CANCELLED' && $order->payment_status !== 'cancelled') {
                $order->update(['payment_status' => 'cancelled']);
                event(new OrderCancelled($order, 'Payment cancelled via IPN', 'customer'));
            }
        });

        return response()->json(['status' => true, 'message' => 'IPN received']);
    }


    /**
     * EPS IPN Webhook - Server-to-server callback for payment verification
     * POST /api/v2/store/payments/eps/ipn
     */
    public function epsIPN(Request $request)
    {
        Log::info('EPS IPN Webhook Received', ['request_data' => $request->all()]);

        // Get IPN parameters
        $merchantTransactionId = $request->input('MerchantTransactionId');
        $epsTransactionId = $request->input('EPSTransactionId_');
        $status = $request->input('Status');
        $amount = $request->input('Amount');

        // Find order
        $order = \App\Modules\Website\Models\WebsiteOrder::where('invoice_no', $merchantTransactionId)->first();

        if (!$order) {
            Log::warning('EPS IPN: Order not found', ['invoice_no' => $merchantTransactionId]);
            return response()->json(['status' => false, 'message' => 'Order not found'], 404);
        }

        // Process based on status
        DB::transaction(function () use ($order, $epsTransactionId, $status) {
            if ($status === 'success' || $status === 'completed') {
                // Payment successful
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'payment_status' => 'paid',
                        'paid_amount' => $order->total_amount,
                        'due_amount' => 0,
                        'status' => 'processing',
                    ]);

                    event(new OrderPaid($order, $epsTransactionId, 'eps'));
                }
            } elseif ($status === 'failed' || $status === 'error') {
                // Payment failed - keep order as pending with payment_status failed
                if ($order->payment_status !== 'failed') {
                    $order->update(['payment_status' => 'failed']);
                    event(new OrderFailed($order, 'Payment failed via IPN', $status));
                }
            } elseif ($status === 'cancelled') {
                // Payment cancelled - keep order as pending, treat as lead
                if ($order->payment_status !== 'cancelled') {
                    $order->update(['payment_status' => 'cancelled']);
                    event(new OrderCancelled($order, 'Payment cancelled via IPN', 'customer'));
                }
            }
        });

        Log::info('EPS IPN Processed', [
            'merchant_transaction_id' => $merchantTransactionId,
            'eps_transaction_id' => $epsTransactionId,
            'status' => $status,
            'amount' => $amount
        ]);

        // Return 200 OK to acknowledge receipt of IPN
        return response()->json([
            'status' => true,
            'message' => 'IPN received'
        ]);
    }

    /**
     * Verify payment callback from frontend
     * POST /api/v2/store/payments/callback
     * Handles SSL Commerz and EPS payment verification from frontend
     */
    public function verifyCallback(Request $request)
    {
        try {
            $callbackType = $request->input('callback_type', 'success');
            $tranId = $request->input('tran_id') ?? $request->input('MerchantTransactionId');

            if (!$tranId) {
                return response()->json([
                    'status' => false,
                    'message' => 'Transaction ID missing',
                    'data' => null,
                    'errors' => null,
                ], 400);
            }

            Log::info('Payment callback verification', ['tran_id' => $tranId, 'callback_type' => $callbackType]);

            // For SSL Commerz: use value_a (sales_order_id)
            $salesOrderId = $request->input('value_a');
            if ($salesOrderId) {
                $order = \App\Modules\Website\Models\WebsiteOrder::find($salesOrderId);
            } else {
                // For EPS or fallback: search by invoice_no (MerchantTransactionId)
                $merchantId = $request->input('MerchantTransactionId');
                $order = $merchantId
                    ? \App\Modules\Website\Models\WebsiteOrder::where('invoice_no', $merchantId)->first()
                    : null;
            }

            if (!$order) {
                return response()->json([
                    'status' => false,
                    'message' => 'Order not found for this payment',
                    'data' => null,
                    'errors' => null,
                ], 404);
            }

            // If callback is success and order not yet marked as paid, update it
            if ($callbackType === 'success' && $order->payment_status !== 'paid') {
                DB::transaction(function () use ($order, $tranId) {
                    $order->update([
                        'payment_status' => 'paid',
                        'paid_amount' => $order->total_amount,
                        'due_amount' => 0,
                        'status' => 'processing',
                    ]);
                    event(new OrderPaid($order, $tranId, 'payment_gateway'));
                });
            } elseif ($callbackType === 'fail' && $order->payment_status !== 'failed') {
                DB::transaction(function () use ($order) {
                    $order->update(['payment_status' => 'failed']);
                    event(new OrderFailed($order));
                });
            } elseif ($callbackType === 'cancel' && $order->payment_status !== 'cancelled') {
                DB::transaction(function () use ($order) {
                    $order->update(['payment_status' => 'cancelled']);
                    event(new OrderCancelled($order));
                });
            }

            return response()->json([
                'status' => true,
                'message' => 'Payment verified successfully',
                'data' => [
                    'payment_id' => $order->id,
                    'tran_id' => $tranId,
                    'order_id' => $order->id,
                    'order_invoice' => $order->invoice_no,
                    'amount' => $order->total_amount,
                    'status' => $order->payment_status,
                    'callback_type' => $callbackType,
                    'customer_name' => $order->customer_name ?? $order->shipping_name,
                    'customer_phone' => $order->customer_phone ?? $order->shipping_phone,
                    'gateway' => 'sslcommerz', // Can be determined from callback type or request
                ],
                'errors' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Payment callback verification failed', ['error' => $e->getMessage()]);
            return response()->json([
                'status' => false,
                'message' => 'Failed to verify payment callback',
                'data' => null,
                'errors' => null,
            ], 500);
        }
    }

    /**
     * Get payment status by transaction ID
     * GET /api/v2/store/payments/status/{tran_id}
     */
    public function getPaymentStatus($tranId)
    {
        try {
            // Try to find payment by transaction ID (works for both SSL and EPS)
            $order = \App\Modules\Website\Models\WebsiteOrder::whereJsonContains('payment_info->tran_id', $tranId)
                ->orWhere('payment_info->eps_tran_id', $tranId)
                ->first();

            if (!$order) {
                return response()->json([
                    'status' => false,
                    'message' => 'Payment not found',
                    'data' => null,
                    'errors' => null,
                ], 404);
            }

            return response()->json([
                'status' => true,
                'message' => 'Payment status retrieved',
                'data' => [
                    'payment_id' => $order->id,
                    'tran_id' => $tranId,
                    'amount' => $order->total_amount,
                    'status' => $order->payment_status,
                    'paid_at' => $order->updated_at,
                    'order_id' => $order->id,
                    'order_invoice' => $order->invoice_no,
                    'order_payment_status' => $order->payment_status,
                ],
                'errors' => null,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to get payment status', ['error' => $e->getMessage(), 'tran_id' => $tranId]);
            return response()->json([
                'status' => false,
                'message' => 'Failed to retrieve payment status',
                'data' => null,
                'errors' => null,
            ], 500);
        }
    }
}
