<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Services\PaymentGateways\SSLCommerzService;
use App\Services\PaymentGateways\EPSService;
use App\Models\PaymentTransaction;
use App\Models\SalesOrder;
use App\Models\Customer;
use App\Http\Requests\InitiatePaymentRequest;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class PaymentGatewayController extends Controller
{
    use ApiResponse;

    protected SSLCommerzService $sslCommerz;
    protected EPSService $eps;

    public function __construct(SSLCommerzService $sslCommerz, EPSService $eps)
    {
        $this->sslCommerz = $sslCommerz;
        $this->eps = $eps;
    }

    /**
     * Initiate payment for an order.
     * POST /api/v2/payments/initiate
     */
    public function initiate(InitiatePaymentRequest $request): JsonResponse
    {
        Log::info('Payment initiation started', ['sales_order_id' => $request->sales_order_id]);

        // Determine which gateway to use
        $gateway = $request->payment_method ?? env('ACTIVE_PAYMENT_GATEWAY', 'sslcommerz');

        Log::info('Payment gateway selected', [
            'gateway' => $gateway,
            'from_request' => isset($request->payment_method),
        ]);

        // Route to EPS if selected
        if ($gateway === 'eps') {
            return $this->initiateEPSPayment($request);
        }

        // Default: SSLCommerz (existing logic)
        return $this->initiateSSLCommerzPayment($request);
    }

    /**
     * Initiate EPS payment.
     */
    protected function initiateEPSPayment(InitiatePaymentRequest $request): JsonResponse
    {
        $order = SalesOrder::find($request->sales_order_id);

        if (!$order) {
            Log::error('Order not found', ['sales_order_id' => $request->sales_order_id]);
            return response()->json([
                'status' => false,
                'error' => 'Order not found',
            ], 404);
        }

        Log::info('EPS Payment: Order found', [
            'order_id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'due_amount' => $order->due_amount,
        ]);

        DB::beginTransaction();
        try {
            // Ensure customer exists
            $customer = $this->resolveCustomer($request, $request->user());

            // Create payment transaction for EPS
            $payment = PaymentTransaction::create([
                'sales_order_id' => $order->id,
                'customer_id' => $customer->id,
                'user_id' => $request->user()?->id,
                'gateway' => 'eps',
                'amount' => $order->due_amount,
                'currency' => 'BDT',
                'status' => 'pending',
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'customer_address' => $request->customer_address,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Prepare data for EPS
            $paymentData = [
                'order_id' => $order->id,
                'amount' => $payment->amount,
                'currency' => 'BDT',
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'customer_address' => is_array($request->customer_address)
                    ? $request->customer_address
                    : ['address' => $request->customer_address ?? ''],
                'shipping_name' => $request->shipping_name ?? $request->customer_name,
                'shipping_address' => is_array($request->shipping_address ?? null)
                    ? $request->shipping_address
                    : ['address' => $request->shipping_address ?? $request->customer_address ?? ''],
            ];

            // Call EPS
            Log::info('Calling EPS API', [
                'order_id' => $order->id,
                'amount' => $payment->amount,
                'customer_name' => $request->customer_name,
            ]);

            $result = $this->eps->createPayment($paymentData);

            Log::info('EPS API response', [
                'success' => $result['success'] ?? false,
                'has_redirect_url' => isset($result['redirect_url']),
                'error' => $result['error'] ?? 'NO ERROR',
                'details' => $result['details'] ?? 'NO DETAILS',
            ]);

            if (!$result['success']) {
                $payment->update([
                    'status' => 'failed',
                    'failed_reason' => $result['error'],
                    'failed_at' => now(),
                ]);
                DB::rollBack();
                return response()->json([
                    'status' => false,
                    'error' => $result['error'],
                    'details' => $result['details'] ?? null,
                ], 500);
            }

            // Update payment with merchant transaction ID
            $payment->update([
                'gateway_tran_id' => $result['merchant_transaction_id'],
                'gateway_response' => $result['gateway_response'],
            ]);

            DB::commit();

            Log::info('EPS Payment initiation successful', [
                'payment_id' => $payment->id,
                'merchant_transaction_id' => $result['merchant_transaction_id'],
                'redirect_url' => $result['redirect_url'],
            ]);

            return response()->json([
                'status' => true,
                'data' => [
                    'gateway_url' => $result['redirect_url'],
                    'tran_id' => $result['merchant_transaction_id'],
                    'amount' => $payment->amount,
                    'currency' => 'BDT',
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('EPS Payment initiation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'status' => false,
                'error' => 'Payment initiation failed',
                'details' => config('app.debug') ? $e->getMessage() : 'Failed to initiate payment',
            ], 500);
        }
    }

    /**
     * Initiate SSLCommerz payment (existing logic).
     */
    protected function initiateSSLCommerzPayment(InitiatePaymentRequest $request): JsonResponse
    {
        $order = SalesOrder::find($request->sales_order_id);

        if (!$order) {
            Log::error('Order not found', ['sales_order_id' => $request->sales_order_id]);
            return response()->json([
                'status' => false,
                'error' => 'Order not found',
            ], 404);
        }

        Log::info('Order found', [
            'order_id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'due_amount' => $order->due_amount,
            'payment_status' => $order->payment_status,
        ]);

        DB::beginTransaction();
        try {
            // Ensure customer exists
            $customer = $this->resolveCustomer($request, $request->user());

            // Create payment transaction
            $payment = PaymentTransaction::create([
                'sales_order_id' => $order->id,
                'customer_id' => $customer->id,
                'user_id' => $request->user()?->id,
                'gateway' => 'sslcommerz',
                'amount' => $order->due_amount,
                'currency' => 'BDT',
                'status' => 'pending',
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'customer_address' => $request->customer_address,
                'emi_option' => $request->emi_option ?? null,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            // Prepare data for SSL Commerz
            $paymentData = [
                'sales_order_id' => $order->id,
                'customer_id' => $customer->id,
                'user_id' => $request->user()?->id,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'customer_name' => $request->customer_name,
                'customer_email' => $request->customer_email,
                'customer_phone' => $request->customer_phone,
                'customer_address' => $request->customer_address,
                'emi_option' => $request->emi_option ?? 0,
            ];

            // Call SSL Commerz
            Log::info('Calling SSLCommerz API', [
                'amount' => $payment->amount,
                'customer_name' => $request->customer_name,
                'customer_phone' => $request->customer_phone,
            ]);

            $result = $this->sslCommerz->createPayment($paymentData);

            Log::info('SSLCommerz API response', [
                'success' => $result['success'] ?? false,
                'has_gateway_url' => isset($result['gateway_url']),
                'gateway_url' => $result['gateway_url'] ?? 'NOT SET',
                'error' => $result['error'] ?? 'NO ERROR',
                'details' => $result['details'] ?? 'NO DETAILS',
            ]);

            if (!$result['success']) {
                $payment->markAsFailed($result['error']);
                DB::rollBack();
                return response()->json([
                    'status' => false,
                    'error' => $result['error'],
                    'details' => $result['details'] ?? null,
                ], 500);
            }

            // Update payment with transaction ID
            $payment->update([
                'gateway_tran_id' => $result['tran_id'],
            ]);

            DB::commit();

            Log::info('Payment initiation successful, returning gateway_url', [
                'payment_id' => $payment->id,
                'gateway_url' => $result['gateway_url'],
                'tran_id' => $result['tran_id'],
            ]);

            return response()->json([
                'status' => true,
                'data' => [
                    'gateway_url' => $result['gateway_url'],
                    'tran_id' => $result['tran_id'],
                    'amount' => $payment->amount,
                    'currency' => 'BDT',
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Payment initiation failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'status' => false,
                'error' => 'Payment initiation failed',
                'details' => config('app.debug') ? $e->getMessage() : 'Failed to initiate payment',
            ], 500);
        }
    }

    /**
     * SSL Commerz success callback.
     * POST /api/v2/payments/success
     */
    public function success(Request $request): JsonResponse
    {
        return $this->handleCallback($request, 'success');
    }

    /**
     * SSL Commerz fail callback.
     * POST /api/v2/payments/fail
     */
    public function fail(Request $request): JsonResponse
    {
        return $this->handleCallback($request, 'fail');
    }

    /**
     * SSL Commerz cancel callback.
     * POST /api/v2/payments/cancel
     */
    public function cancel(Request $request): JsonResponse
    {
        return $this->handleCallback($request, 'cancel');
    }

    /**
     * SSL Commerz IPN (Instant Payment Notification).
     * POST /api/v2/payments/ipn
     */
    public function ipn(Request $request): JsonResponse
    {
        // LOG RAW SSLCOMMERZ IPN RESPONSE (No modification)
        Log::info('========== SSLCOMMERZ RAW IPN RESPONSE ==========', [
            'all_data' => $request->all(),
            'headers' => $request->headers->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        Log::info('========== END RAW SSLCOMMERZ IPN RESPONSE ==========');

        Log::info('SSL Commerz: IPN Received', $request->all());

        $result = $this->sslCommerz->verifyIPN($request->all());

        if (!$result['success']) {
            return response()->json([
                'status' => 'error',
                'message' => $result['error'] ?? 'IPN verification failed',
            ], 400);
        }

        if ($result['already_processed'] ?? false) {
            return response()->json([
                'status' => 'success',
                'message' => 'IPN already processed',
            ]);
        }

        // Send confirmation email
        if (isset($result['sales_order']) && isset($result['payment'])) {
            try {
                $result['sales_order']->customer->notify(new \App\Notifications\PaymentSuccessfulNotification($result['sales_order'], $result['payment']));
            } catch (\Exception $e) {
                Log::error('Failed to send payment notification', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'IPN processed successfully',
        ]);
    }

    /**
     * Get payment status by transaction ID.
     * GET /api/v2/payments/status/{tran_id}
     */
    public function status(string $tranId): JsonResponse
    {
        $payment = PaymentTransaction::where('gateway_tran_id', $tranId)
            ->with('salesOrder')
            ->first();

        if (!$payment) {
            return $this->sendError('Payment transaction not found', null, 404);
        }

        return $this->sendSuccess([
            'payment_id' => $payment->id,
            'tran_id' => $payment->gateway_tran_id,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'paid_at' => $payment->paid_at,
            'order_id' => $payment->sales_order_id,
            'order_invoice' => $payment->salesOrder->invoice_no,
            'order_payment_status' => $payment->salesOrder->payment_status,
        ]);
    }

    /**
     * Get EMI options for an amount.
     * POST /api/v2/payments/emi-options
     */
    public function emiOptions(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation failed', $validator->errors(), 422);
        }

        $options = $this->sslCommerz->getEmiOptions((float) $request->amount);

        return $this->sendSuccess([
            'amount' => (float) $request->amount,
            'currency' => 'BDT',
            'emi_enabled' => config('sslcommerz.emi.enabled'),
            'min_amount' => config('sslcommerz.emi.min_amount'),
            'options' => $options,
            'banks' => $this->sslCommerz->getEmiBanks(),
        ]);
    }

    /**
     * EPS success callback.
     * Customer is redirected here after successful payment.
     * POST /api/v2/payments/eps/success
     */
    public function epsSuccess(Request $request)
    {
        Log::info('EPS: Success callback received', $request->all());

        // EPS returns merchantTransactionId and valueA (our order_id)
        $merchantTransactionId = $request->input('merchantTransactionId');
        $orderId = $request->input('valueA'); // This is our order_id
        $tranId = $request->input('tranId');

        if (!$merchantTransactionId || !$orderId) {
            // Redirect to frontend with error
            return redirect()->away(config('app.frontend_url') . '/payment/fail?reason=missing_params');
        }

        // Verify transaction with EPS
        $verification = $this->eps->queryTransaction($merchantTransactionId);
        $epsStatus = $verification['data']['status'] ?? 'FAILED';

        if ($epsStatus === 'SUCCESS') {
            // Find and update payment transaction
            $payment = PaymentTransaction::where('sales_order_id', $orderId)
                ->where('gateway', 'eps')
                ->first();

            $invoiceNo = null;

            if ($payment && $payment->status !== 'paid') {
                DB::beginTransaction();
                try {
                    $payment->update([
                        'status' => 'paid',
                        'gateway_tran_id' => $merchantTransactionId,
                        'eps_tran_id' => $tranId ?? $merchantTransactionId,
                        'payment_channel' => $verification['data']['paymentMethod'] ?? null,
                        'bank_name' => $verification['data']['bankName'] ?? null,
                        'card_type' => $verification['data']['cardType'] ?? null,
                        'eps_response' => $verification['data'],
                        'paid_at' => now(),
                    ]);

                    // Update sales order
                    $salesOrder = $payment->salesOrder;
                    $salesOrder->update([
                        'payment_status' => 'paid',
                        'paid_amount' => $salesOrder->paid_amount + $payment->amount,
                        'due_amount' => max(0, $salesOrder->total_amount - $salesOrder->paid_amount - $payment->amount),
                        'status' => 'processing',
                    ]);

                    $invoiceNo = $salesOrder->invoice_no;

                    DB::commit();

                    Log::info('EPS: Payment marked as paid via success callback', [
                        'payment_id' => $payment->id,
                        'order_id' => $orderId,
                        'merchant_transaction_id' => $merchantTransactionId,
                    ]);

                } catch (\Exception $e) {
                    DB::rollBack();
                    Log::error('EPS: Failed to update payment', [
                        'error' => $e->getMessage(),
                    ]);
                    // Redirect to frontend with error
                    return redirect()->away(config('app.frontend_url') . '/payment/fail?reason=update_failed');
                }
            }

            // Get invoice from sales order if we have it
            if ($payment && !$invoiceNo) {
                $invoiceNo = $payment->salesOrder->invoice_no ?? $orderId;
            }

            // Redirect to frontend success page
            $frontendUrl = config('app.frontend_url');
            return redirect()->away("{$frontendUrl}/payment/callback/success?invoice={$invoiceNo}&payment=eps");
        }

        // Payment verification failed - redirect to frontend fail page
        return redirect()->away(config('app.frontend_url') . '/payment/fail?reason=verification_failed');
    }

    /**
     * EPS fail callback.
     * Customer is redirected here after failed payment.
     * POST /api/v2/payments/eps/fail
     */
    public function epsFail(Request $request): JsonResponse
    {
        Log::info('EPS: Fail callback received', $request->all());

        // EPS returns merchantTransactionId and valueA (our order_id)
        $orderId = $request->input('valueA') ?? $request->input('order_id');
        $errorMessage = $request->input('errorMessage') ?? $request->input('error_reason') ?? 'Payment failed';

        if ($orderId) {
            $payment = PaymentTransaction::where('sales_order_id', $orderId)
                ->where('gateway', 'eps')
                ->first();

            if ($payment && $payment->status === 'pending') {
                $payment->update([
                    'status' => 'failed',
                    'failed_reason' => $errorMessage,
                    'eps_response' => $request->all(),
                    'failed_at' => now(),
                ]);

                Log::info('EPS: Payment marked as failed', [
                    'payment_id' => $payment->id,
                    'order_id' => $orderId,
                    'reason' => $errorMessage,
                ]);
            }
        }

        // Redirect to frontend fail page
        return redirect()->away(config('app.frontend_url') . '/payment/callback/fail?reason=' . urlencode($errorMessage));
    }

    /**
     * EPS cancel callback.
     * Customer cancelled payment on EPS page.
     * POST /api/v2/payments/eps/cancel
     */
    public function epsCancel(Request $request)
    {
        Log::info('EPS: Cancel callback received', $request->all());

        // EPS returns merchantTransactionId and valueA (our order_id)
        $orderId = $request->input('valueA') ?? $request->input('order_id');

        if ($orderId) {
            $payment = PaymentTransaction::where('sales_order_id', $orderId)
                ->where('gateway', 'eps')
                ->first();

            if ($payment && $payment->status === 'pending') {
                $payment->update([
                    'status' => 'cancelled',
                    'eps_response' => $request->all(),
                ]);

                Log::info('EPS: Payment marked as cancelled', [
                    'payment_id' => $payment->id,
                    'order_id' => $orderId,
                ]);
            }
        }

        // Redirect to frontend cancel page
        return redirect()->away(config('app.frontend_url') . '/payment/callback/cancel');
    }

    /**
     * EPS IPN (Instant Payment Notification).
     * EPS server sends payment notification.
     * POST /api/v2/payments/eps/ipn
     */
    public function epsIPN(Request $request)
    {
        // LOG RAW EPS IPN RESPONSE
        Log::info('========== EPS RAW IPN RESPONSE ==========', [
            'all_data' => $request->all(),
            'headers' => $request->headers->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        Log::info('========== END RAW EPS IPN RESPONSE ==========');

        Log::info('EPS: IPN Received', $request->all());

        $result = $this->eps->verifyIPN($request->all());

        if (!$result['success']) {
            return $this->ipnResponse('FAILED', $result['error'] ?? 'IPN verification failed');
        }

        if ($result['already_processed'] ?? false) {
            return $this->ipnResponse('OK', 'IPN already processed');
        }

        // Send confirmation email
        if (isset($result['sales_order']) && isset($result['payment'])) {
            try {
                $result['sales_order']->customer->notify(new \App\Notifications\PaymentSuccessfulNotification($result['sales_order'], $result['payment']));
            } catch (\Exception $e) {
                Log::error('Failed to send EPS payment notification', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $this->ipnResponse('OK', 'IPN processed successfully');
    }

    /**
     * Get EPS payment status by order ID.
     * GET /api/v2/payments/eps/status/{order_id}
     */
    public function epsStatus(string $orderId): JsonResponse
    {
        $payment = PaymentTransaction::where('sales_order_id', $orderId)
            ->where('gateway', 'eps')
            ->with('salesOrder')
            ->first();

        if (!$payment) {
            return $this->sendError('EPS payment transaction not found', null, 404);
        }

        // Query EPS for latest status using merchantTransactionId
        $merchantTransactionId = $payment->gateway_tran_id;
        $verification = $merchantTransactionId ? $this->eps->queryTransaction($merchantTransactionId) : null;

        return $this->sendSuccess([
            'payment_id' => $payment->id,
            'order_id' => $orderId,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'paid_at' => $payment->paid_at,
            'eps_tran_id' => $payment->eps_tran_id,
            'merchant_transaction_id' => $merchantTransactionId,
            'payment_channel' => $payment->payment_channel,
            'bank_name' => $payment->bank_name,
            'card_type' => $payment->card_type,
            'eps_status' => $verification['data']['status'] ?? 'UNKNOWN',
            'order_invoice' => $payment->salesOrder->invoice_no,
            'order_payment_status' => $payment->salesOrder->payment_status,
        ]);
    }

    /**
     * Return IPN response in XML format as per EPS specification.
     */
    protected function ipnResponse(string $status, string $message): string
    {
        return '<?xml version="1.0" encoding="UTF-8"?>' . "\n" .
               '<response>' . "\n" .
               '    <status>' . htmlspecialchars($status) . '</status>' . "\n" .
               '    <message>' . htmlspecialchars($message) . '</message>' . "\n" .
               '</response>';
    }

    /**
     * Cron job: Verify pending payments.
     * GET /api/v2/payments/verify-pending?secret={secret}
     */
    public function verifyPending(Request $request): JsonResponse
    {
        $secret = config('sslcommerz.verification.secret_key');

        if ($request->secret !== $secret) {
            Log::warning('Payment verification cron: Invalid secret key');
            return $this->sendError('Unauthorized', null, 401);
        }

        $checkMinutes = config('sslcommerz.verification.check_minutes', 15);
        $maxAttempts = config('sslcommerz.verification.max_attempts', 5);

        // Get pending payments older than checkMinutes
        $pendingPayments = PaymentTransaction::pending()
            ->where('created_at', '<', now()->subMinutes($checkMinutes))
            ->where('gateway', 'sslcommerz')
            ->with('salesOrder')
            ->get();

        $verified = 0;
        $failed = 0;
        $alreadyProcessed = 0;

        foreach ($pendingPayments as $payment) {
            // Skip if too many attempts
            if ($payment->created_at->diffInMinutes(now()) > $checkMinutes * $maxAttempts) {
                $payment->markAsFailed('Verification timeout - too many attempts');
                $failed++;
                continue;
            }

            // Query SSL Commerz
            $result = $this->sslCommerz->queryTransaction($payment->gateway_tran_id);

            if ($result['success'] && isset($result['data']['element'][0])) {
                $tranData = $result['data']['element'][0];
                $status = strtoupper($tranData['status']);

                if ($status === 'SUCCESS' || $status === 'VALID') {
                    // Process successful payment
                    $ipnData = [
                        'tran_id' => $tranData['tran_id'],
                        'amount' => $tranData['amount'],
                        'currency' => $tranData['currency'],
                        'status' => $tranData['status'],
                        'card_type' => $tranData['card_type'] ?? null,
                        'store_amount' => $tranData['store_amount'] ?? null,
                    ];

                    $ipnResult = $this->sslCommerz->verifyIPN($ipnData);
                    if ($ipnResult['success']) {
                        $verified++;
                    }
                } elseif ($status === 'FAILED') {
                    $payment->markAsFailed($tranData['error'] ?? 'Payment failed');
                    $failed++;
                }
            } else {
                $alreadyProcessed++;
            }
        }

        return $this->sendSuccess([
            'checked' => $pendingPayments->count(),
            'verified' => $verified,
            'failed' => $failed,
            'already_processed' => $alreadyProcessed,
            'timestamp' => now()->toDateTimeString(),
        ], 'Payment verification completed');
    }

    /**
     * Handle SSL Commerz callback (success/fail/cancel).
     */
    protected function handleCallback(Request $request, string $type): JsonResponse
    {
        // LOG RAW SSLCOMMERZ CALLBACK RESPONSE (No modification)
        Log::info('========== SSLCOMMERZ RAW CALLBACK RESPONSE ==========', [
            'callback_type' => $type,
            'all_data' => $request->all(),
            'headers' => $request->headers->all(),
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        Log::info('========== END RAW SSLCOMMERZ CALLBACK RESPONSE ==========');

        $tranId = $request->input('tran_id');

        if (!$tranId) {
            return $this->sendError('Transaction ID not provided', null, 400);
        }

        $payment = PaymentTransaction::where('gateway_tran_id', $tranId)
            ->with('salesOrder')
            ->first();

        if (!$payment) {
            return $this->sendError('Payment transaction not found', null, 404);
        }

        // For success/fail/cancel, we return JSON
        // The frontend will handle the redirect
        return $this->sendSuccess([
            'payment_id' => $payment->id,
            'tran_id' => $payment->gateway_tran_id,
            'order_id' => $payment->sales_order_id,
            'order_invoice' => $payment->salesOrder->invoice_no,
            'amount' => $payment->amount,
            'status' => $payment->status,
            'callback_type' => $type,
        ], "Payment {$type} recorded");
    }

    /**
     * Resolve or create customer from request.
     */
    protected function resolveCustomer(Request $request, $user = null): Customer
    {
        if ($user) {
            $customer = Customer::where('user_id', $user->id)->first();
            if ($customer) {
                return $customer;
            }
        }

        // Find by phone
        $customer = Customer::where('phone', $request->customer_phone)
            ->when($user, fn ($q) => $q->whereNull('user_id'))
            ->first();

        if ($customer) {
            // Link to user if not already linked
            if ($user && !$customer->user_id) {
                $customer->update(['user_id' => $user->id]);
            }
            return $customer;
        }

        // Create new customer
        return Customer::create([
            'name' => $request->customer_name,
            'phone' => $request->customer_phone,
            'user_id' => $user?->id,
            'type' => 'retail',
        ]);
    }
}
