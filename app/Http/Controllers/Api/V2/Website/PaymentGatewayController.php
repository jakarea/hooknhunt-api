<?php

namespace App\Http\Controllers\Api\V2\Website;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Services\PaymentGateways\EPSPayment;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class PaymentGatewayController extends Controller
{

    public function getActiveGateway()
    {
        // Get active payment gateway from database
        $activeGateway = \App\Models\Setting::getWebsiteSetting('active_payment_gateway', 'sslcommerz');

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
            'payment_method' => 'required|in:eps,sslcommerz',
        ]);

        Log::info('Validation passed', ['validated' => $validated]);

        // Get the order with its items
        $order = \App\Models\SalesOrder::with('items')->find($validated['sales_order_id']);

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

        // Build EPS payload with actual order data
        $payload = [
            "totalAmount" => (float)$order->total_amount,
            "ipAddress" => $request->ip() ?: '47.247.196.37', // Fallback IP

            'CustomerOrderId' => $order->invoice_no,
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
            $errorResponse = [
                'status' => false,
                'error' => $data['ErrorMessage'] ?? 'Payment initiation failed'
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
     * EPS Success Callback - User redirected here after successful payment
     * GET /api/v2/store/payments/success
     */
    public function success(Request $request)
    {
        // Get EPS parameters securely
        $merchantTransactionId = $request->query('MerchantTransactionId');
        $epsTransactionId = $request->query('EPSTransactionId_');
        $status = $request->query('Status');
        $errorCode = $request->query('ErrorCode');
        $errorMessage = $request->query('ErrorMessage');

        Log::info('EPS Success Callback', [
            'merchant_transaction_id' => $merchantTransactionId,
            'eps_transaction_id' => $epsTransactionId,
            'status' => $status
        ]);

        // TODO: Update order status in database based on EPS response
        // TODO: Verify payment with EPS API using CheckPaymentStatus()

        // For now, redirect to frontend with payment details
        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:3000');

        return redirect()->away($frontendUrl . '/order-success?' . http_build_query([
            'tran_id' => $epsTransactionId,
            'invoice' => $merchantTransactionId,
            'status' => $status,
            'gateway' => 'eps',
        ]));
    }


    /**
     * EPS Fail Callback - User redirected here after failed payment
     * GET /api/v2/store/payments/fail
     */
    public function fail(Request $request)
    {
        // Get EPS parameters securely
        $merchantTransactionId = $request->query('MerchantTransactionId');
        $epsTransactionId = $request->query('EPSTransactionId_');
        $status = $request->query('Status');
        $errorCode = $request->query('ErrorCode');
        $errorMessage = $request->query('ErrorMessage');

        Log::error('EPS Fail Callback', [
            'merchant_transaction_id' => $merchantTransactionId,
            'eps_transaction_id' => $epsTransactionId,
            'status' => $status,
            'error_code' => $errorCode,
            'error_message' => $errorMessage
        ]);

        // Load order to get details for the failure page
        $orderTotal = 0;
        $customerName = '';
        if ($merchantTransactionId) {
            $order = \App\Models\SalesOrder::where('invoice_no', $merchantTransactionId)->first();
            if ($order) {
                $orderTotal = $order->total_amount ?? 0;
                $customerName = $order->customer_name ?? '';
            }
        }

        // TODO: Update order status as failed in database

        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:3000');

        return redirect()->away($frontendUrl . '/order-fail?' . http_build_query([
            'invoice' => $merchantTransactionId,
            'total' => $orderTotal,
            'name' => $customerName,
            'tran_id' => $epsTransactionId,
            'reason' => $errorMessage ?: 'Payment failed',
            'gateway' => 'eps',
        ]));
    }


    /**
     * EPS Cancel Callback - User redirected here after canceling payment
     * GET /api/v2/store/payments/cancel
     */
    public function cancel(Request $request)
    {
        // Get EPS parameters securely
        $merchantTransactionId = $request->query('MerchantTransactionId');
        $epsTransactionId = $request->query('EPSTransactionId_');
        $status = $request->query('Status');
        $errorCode = $request->query('ErrorCode');
        $errorMessage = $request->query('ErrorMessage');

        Log::warning('EPS Cancel Callback', [
            'merchant_transaction_id' => $merchantTransactionId,
            'eps_transaction_id' => $epsTransactionId,
            'status' => $status
        ]);

        // Load order to get details for the cancel page
        $orderTotal = 0;
        $customerName = '';
        if ($merchantTransactionId) {
            $order = \App\Models\SalesOrder::where('invoice_no', $merchantTransactionId)->first();
            if ($order) {
                $orderTotal = $order->total_amount ?? 0;
                $customerName = $order->customer_name ?? '';
            }
        }

        // TODO: Update order status as cancelled in database

        $frontendUrl = config('app.frontend_url') ?? env('FRONTEND_URL', 'http://localhost:3000');

        return redirect()->away($frontendUrl . '/order-cancel?' . http_build_query([
            'invoice' => $merchantTransactionId,
            'total' => $orderTotal,
            'name' => $customerName,
            'tran_id' => $epsTransactionId,
            'message' => $errorMessage,
            'gateway' => 'eps',
        ]));
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

        // TODO: Verify payment with EPS API using CheckPaymentStatus()
        // TODO: Update order payment status in database
        // TODO: Create payment transaction record

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
}
