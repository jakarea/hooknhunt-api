<?php

namespace App\Services\PaymentGateways;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use App\Models\PaymentTransaction;
use App\Enums\PaymentGateway;

class SSLCommerzService
{
    protected array $config;
    protected bool $isSandbox;

    public function __construct()
    {
        $this->config = config('sslcommerz');
        $this->isSandbox = $this->config['mode'] === 'sandbox';
    }

    /**
     * Get credentials based on mode.
     */
    protected function getCredentials(): array
    {
        $key = $this->isSandbox ? 'sandbox' : 'live';
        return [
            'store_id' => $this->config[$key]['store_id'],
            'store_passwd' => $this->config[$key]['store_password'],
            'base_url' => $this->config[$key]['base_url'],
        ];
    }

    /**
     * Create payment session and get gateway URL.
     */
    public function createPayment(array $data): array
    {
        $creds = $this->getCredentials();

        // Generate unique transaction ID
        $tranId = $this->generateTransactionId();

        // Build SSL Commerz payload
        $payload = [
            'store_id' => $creds['store_id'],
            'store_passwd' => $creds['store_passwd'],
            'total_amount' => number_format($data['amount'], 2, '.', ''),
            'currency' => $data['currency'] ?? 'BDT',
            'tran_id' => $tranId,
            'success_url' => $this->config['success_url'],
            'fail_url' => $this->config['fail_url'],
            'cancel_url' => $this->config['cancel_url'],
            'ipn_url' => $this->config['ipn_url'],

            // Customer information
            'cus_name' => $data['customer_name'],
            'cus_email' => $data['customer_email'] ?? 'guest@example.com',
            'cus_phone' => $data['customer_phone'],
            'cus_add1' => $data['customer_address']['address']
                ?? ($data['customer_address']['address_line1'] ?? 'N/A'),
            'cus_add2' => $data['customer_address']['district']
                ?? $data['customer_address']['address_line2']
                ?? '',
            'cus_city' => $data['customer_address']['thana']
                ?? $data['customer_address']['city']
                ?? $data['customer_address']['district']
                ?? 'Dhaka',
            'cus_country' => $data['customer_address']['country'] ?? 'Bangladesh',
            'cus_postcode' => $data['customer_address']['postal_code'] ?? '1000',

            // Shipping information (same as billing for now)
            'ship_name' => $data['customer_name'],
            'ship_add1' => $data['customer_address']['address']
                ?? ($data['customer_address']['address_line1'] ?? 'N/A'),
            'ship_city' => $data['customer_address']['thana']
                ?? $data['customer_address']['city']
                ?? $data['customer_address']['district']
                ?? 'Dhaka',
            'ship_country' => $data['customer_address']['country'] ?? 'Bangladesh',
            'ship_postcode' => $data['customer_address']['postal_code'] ?? '1000',

            // Product information
            'product_name' => 'Order Payment',
            'product_category' => 'E-commerce',
            'product_profile' => 'general',

            // Custom data (for IPN verification)
            'value_a' => $data['sales_order_id'],
            'value_b' => $data['customer_id'],
            'value_c' => $data['user_id'] ?? 'guest',

            // EMI option
            'emi_option' => $data['emi_option'] ?? 0,
        ];

        Log::info('SSL Commerz: Create Payment Request', [
            'tran_id' => $tranId,
            'amount' => $data['amount'],
            'sandbox' => $this->isSandbox,
        ]);

        // Call SSL Commerz API
        $response = Http::timeout($this->config['timeout'])->asForm()->post(
            "{$creds['base_url']}/gwprocess/v4/api.php",
            $payload
        );

        // LOG RAW RESPONSE FROM SSLCOMMERZ (No modification)
        Log::info('========== SSLCOMMERZ RAW RESPONSE ==========', [
            'tran_id' => $tranId,
            'http_status' => $response->status(),
            'headers' => $response->headers(),
            'raw_body' => $response->body(),
            'decoded_json' => $response->json(),
        ]);
        Log::info('========== END RAW SSLCOMMERZ RESPONSE ==========');

        $result = $response->json();

        Log::info('SSL Commerz: Create Payment Response', [
            'tran_id' => $tranId,
            'status' => $response->status(),
            'body' => $result,
        ]);

        if ($response->successful() && !empty($result['GatewayPageURL'])) {
            return [
                'success' => true,
                'gateway_url' => $result['GatewayPageURL'],
                'tran_id' => $tranId,
                'sessionkey' => $result['sessionkey'] ?? null,
            ];
        }

        // Check for specific SSLCommerz error responses
        $errorReason = $result['failedreason'] ?? $result['error_reason'] ?? 'Failed to create payment session';

        Log::error('SSL Commerz: Payment session creation failed', [
            'tran_id' => $tranId,
            'http_status' => $response->status(),
            'error_reason' => $errorReason,
            'response_body' => $result,
        ]);

        return [
            'success' => false,
            'error' => $errorReason,
            'details' => $result,
        ];
    }

    /**
     * Verify IPN (Instant Payment Notification).
     */
    public function verifyIPN(array $data): array
    {
        // Verify hash
        if (!$this->verifyHash($data)) {
            Log::warning('SSL Commerz: Invalid IPN hash', [
                'tran_id' => $data['tran_id'] ?? 'unknown',
                'received_hash' => $data['verify_sign'] ?? 'none',
            ]);

            return [
                'success' => false,
                'error' => 'Invalid hash signature',
            ];
        }

        Log::info('SSL Commerz: IPN Received', [
            'tran_id' => $data['tran_id'],
            'status' => $data['status'],
            'amount' => $data['amount'],
        ]);

        // Find payment transaction
        $payment = PaymentTransaction::where('gateway_tran_id', $data['tran_id'])
            ->where('gateway', PaymentGateway::SSLCOMMERZ->value)
            ->first();

        if (!$payment) {
            Log::error('SSL Commerz: Payment transaction not found', [
                'tran_id' => $data['tran_id'],
            ]);

            return [
                'success' => false,
                'error' => 'Payment transaction not found',
            ];
        }

        // Check if already processed
        if ($payment->isPaid()) {
            return [
                'success' => true,
                'already_processed' => true,
                'payment' => $payment,
            ];
        }

        // Process based on status
        $status = strtoupper($data['status']);

        if ($status === 'SUCCESS' || $status === 'VALID') {
            $payment->markAsPaid($data);

            // Update sales order
            $salesOrder = $payment->salesOrder;
            $salesOrder->update([
                'payment_status' => 'paid',
                'paid_amount' => $salesOrder->paid_amount + $payment->amount,
                'due_amount' => max(0, $salesOrder->total_amount - $salesOrder->paid_amount - $payment->amount),
                'status' => 'processing',
            ]);

            Log::info('SSL Commerz: Payment successful', [
                'payment_id' => $payment->id,
                'sales_order_id' => $salesOrder->id,
            ]);

            return [
                'success' => true,
                'payment' => $payment,
                'sales_order' => $salesOrder,
            ];
        }

        if ($status === 'FAILED') {
            $payment->markAsFailed($data['error_reason'] ?? 'Payment failed by gateway', $data);

            Log::info('SSL Commerz: Payment failed', [
                'payment_id' => $payment->id,
                'reason' => $data['error_reason'] ?? 'Unknown',
            ]);

            return [
                'success' => false,
                'payment' => $payment,
                'error' => $data['error_reason'] ?? 'Payment failed',
            ];
        }

        return [
            'success' => false,
            'error' => 'Unknown status: ' . $status,
        ];
    }

    /**
     * Query transaction status from SSL Commerz.
     */
    public function queryTransaction(string $tranId): array
    {
        $creds = $this->getCredentials();

        $payload = [
            'store_id' => $creds['store_id'],
            'store_passwd' => $creds['store_passwd'],
            'tran_id' => $tranId,
            'request_key' => $this->generateRequestKey(),
        ];

        Log::info('SSL Commerz: Query Transaction', [
            'tran_id' => $tranId,
            'sandbox' => $this->isSandbox,
        ]);

        $response = Http::timeout($this->config['timeout'])->asForm()->post(
            "{$creds['base_url']}/validator/api/merchantTransIDvalidationAPI.php",
            $payload
        );

        // LOG RAW RESPONSE FROM SSLCOMMERZ (No modification)
        Log::info('========== SSLCOMMERZ QUERY RAW RESPONSE ==========', [
            'tran_id' => $tranId,
            'http_status' => $response->status(),
            'headers' => $response->headers(),
            'raw_body' => $response->body(),
            'decoded_json' => $response->json(),
        ]);
        Log::info('========== END RAW SSLCOMMERZ RESPONSE ==========');

        $result = $response->json();

        return [
            'success' => $response->successful(),
            'data' => $result,
            'status' => $response->status(),
        ];
    }

    /**
     * Verify hash signature from SSL Commerz.
     */
    protected function verifyHash(array $data): bool
    {
        if (!isset($data['verify_sign']) || !isset($data['verify_key'])) {
            return false;
        }

        $creds = $this->getCredentials();
        $merchant_url = $creds['store_id'] . $data['verify_key'] . $data['tran_id'] . $data['amount'] . $data['currency'] . $data['status'];

        # NEW HASH GENERATION FOR SSLCOMMERZ
        #md5(merchant_url|store_passwd|verify_sign)
        #where | (pipe) is concatenation operator

        if (strtoupper($data['store_type']) == 'JSON') {
            $hash = md5($merchant_url . '|' . $creds['store_passwd'] . '|' . $data['verify_sign']);
        } else {
            $hash = md5($merchant_url . $creds['store_passwd'] . $data['verify_sign']);
        }

        return strtoupper($hash) === strtoupper($data['verify_sign']);
    }

    /**
     * Generate unique transaction ID.
     */
    protected function generateTransactionId(): string
    {
        return 'PG-' . now()->format('YmdHis') . '-' . rand(10000, 99999);
    }

    /**
     * Generate request key for transaction query.
     */
    protected function generateRequestKey(): string
    {
        return md5(time() . rand(100000, 999999));
    }

    /**
     * Get EMI banks list.
     */
    public function getEmiBanks(): array
    {
        return $this->config['emi_banks'] ?? [];
    }

    /**
     * Get EMI options for given amount.
     */
    public function getEmiOptions(float $amount): array
    {
        $emiEnabled = $this->config['emi']['enabled'] ?? true;
        $minAmount = $this->config['emi']['min_amount'] ?? 1000;

        if (!$emiEnabled || $amount < $minAmount) {
            return [];
        }

        $tenures = $this->config['emi']['tenures'] ?? [3, 6, 9, 12];
        $interestRate = 0.15; // 15% per year (example)

        $options = [];
        foreach ($tenures as $tenure) {
            $monthlyInterest = $amount * ($interestRate / 12);
            $totalAmount = $amount + ($monthlyInterest * $tenure);
            $monthlyPayment = $totalAmount / $tenure;

            $options[] = [
                'tenure' => $tenure,
                'interest_rate' => $interestRate * 100,
                'monthly_payment' => round($monthlyPayment, 2),
                'total_amount' => round($totalAmount, 2),
                'total_interest' => round($totalAmount - $amount, 2),
            ];
        }

        return $options;
    }

    /**
     * Check if sandbox mode is active.
     */
    public function isSandbox(): bool
    {
        return $this->isSandbox;
    }
}
