<?php

namespace App\Services\PaymentGateways;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Exception;

class EPSPayment
{

    protected $config = [];

    protected $baseUrl;
    protected $userName;
    protected $password;
    protected $deviceTypeId;
    protected $hashkey;
    protected $merchent_id;
    protected $store_id;

    /**
     * EPSService constructor.
     */
    public function __construct()
    {
        // Config file is named epsPayment.php
        $this->config = config('epsPayment');

        // Validate config exists
        if (!$this->config) {
            throw new Exception('EPS configuration not found. Please run php artisan config:clear');
        }

        // Get mode from config (sandbox or live)
        $mode = $this->config['mode'] ?? 'sandbox';

        if (!isset($this->config[$mode]) || !isset($this->config['apiUrl'])) {
            throw new Exception("EPS {$mode} configuration is incomplete");
        }

        $credentials = $this->config[$mode];

        // Set properties from config
        $this->baseUrl = $this->config['EPSBaseURL'] ?? '';
        $this->userName = $credentials['store_username'] ?? '';
        $this->password = $credentials['store_password'] ?? '';
        $this->deviceTypeId = $credentials['device_type_id'] ?? '';
        $this->hashkey = $credentials['hash_key'] ?? '';
        $this->merchent_id = $credentials['store_id'] ?? '';
        $this->store_id = $credentials['store_id'] ?? '';

        // Validate required credentials
        if (empty($this->baseUrl) || empty($this->userName) || empty($this->password) || empty($this->hashkey)) {
            throw new Exception("EPS credentials are not properly configured for {$mode} mode");
        }
    }

    /**
     * Get current mode (sandbox or live)
     */
    public function getMode(): string
    {
        return $this->config['mode'] ?? 'sandbox';
    }


    /**
     * Generate HMAC hash for API authentication
     */
    protected function GenerateHash($payload, $hashkey = null)
    {
        $hashkey = $hashkey ?? $this->hashkey;

        if (empty($hashkey)) {
            throw new Exception('Hash key is not configured');
        }

        $utf8_key = utf8_encode($hashkey);
        $utf8_payload = utf8_encode($payload);
        $data = hash_hmac('sha512', $utf8_payload, $utf8_key, true);
        $hmac = base64_encode($data);

        return $hmac;
    }

    /**
     * Get authentication token from EPS
     */
    protected function GetToken()
    {
        try {
            $req_body = array(
                "userName" => $this->userName,
                "password" => $this->password
            );
            $x_hash = $this->GenerateHash($this->userName);

            $response = Http::timeout(30)->withHeaders([
                "x-hash" => $x_hash,
                "Content-Type" => "application/json"
            ])->post($this->baseUrl . $this->config['apiUrl']['GetToken'], $req_body);

            if ($response->status() == 200) {
                $data = $response->json();
                if (isset($data['token'])) {
                    return $data;
                }
            }

            Log::error('EPS GetToken failed', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            throw new Exception('Failed to get EPS authentication token');

        } catch (Exception $e) {
            Log::error('EPS GetToken exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    /**
     * Create payment with EPS
     */
    public function CreatePayment(array $payload)
    {
        try {
            $getToken_response = $this->GetToken();

            if (!isset($getToken_response['token'])) {
                throw new Exception('EPS authentication token not received');
            }

            // Use actual order invoice_no instead of time()
            $invoice_id = $payload['CustomerOrderId'] ?? (string)time();

            $req_body = array(
                "deviceTypeId" => $this->deviceTypeId,
                "merchantId" => $this->merchent_id,
                "storeId" => $this->store_id,
                "transactionTypeId" => 1,
                "financialEntityId" => 0,
                "version" => "1",
                "transactionDate" => date('c'),
                "transitionStatusId" => 0,
                "valueD" => "",
                "merchantTransactionId" => $invoice_id,
            );

            $req_body = array_merge($req_body, $payload);

            $x_hash = $this->GenerateHash($invoice_id);
            $token = $getToken_response['token'];

            Log::info('EPS CreatePayment Request', [
                'invoice_id' => $invoice_id,
                'amount' => $payload['totalAmount'] ?? 0
            ]);

            $response = Http::timeout(30)->withHeaders([
                "x-hash" => $x_hash,
                "Authorization" => "Bearer $token",
                "Content-Type" => "application/json"
            ])->post($this->baseUrl . $this->config['apiUrl']['Initialize'], $req_body);

            Log::info('EPS CreatePayment Response', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            if ($response->status() == 200) {
                $data = $response->json();
                $data['isSuccess'] = true;
                return $data;
            }
            else {
                $data = $response->json();
                $data['isSuccess'] = false;
                $data['ErrorMessage'] = $data['ErrorMessage'] ?? $response->body() ?? 'Payment initialization failed';
                return $data;
            }

        } catch (Exception $e) {
            Log::error('EPS CreatePayment exception', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);

            // Return error response
            return [
                'isSuccess' => false,
                'ErrorMessage' => $e->getMessage()
            ];
        }
    }

    /**
     * Check payment status after payment
     */
    public function CheckPaymentStatus($invoice_id)
    {
        try {
            $getToken_response = $this->GetToken();

            if (!isset($getToken_response['token'])) {
                throw new Exception('EPS authentication token not received');
            }

            $x_hash = $this->GenerateHash($invoice_id);
            $token = $getToken_response['token'];

            $response = Http::timeout(30)->withHeaders([
                "x-hash" => $x_hash,
                "Authorization" => "Bearer $token",
                "Content-Type" => "application/json"
            ])->get($this->baseUrl . $this->config['apiUrl']['CheckPaymentStatus'] . $invoice_id);

            Log::info('EPS CheckPaymentStatus Response', [
                'invoice_id' => $invoice_id,
                'status' => $response->status()
            ]);

            if ($response->status() == 200) {
                return $response->json();
            }

            Log::error('EPS CheckPaymentStatus failed', [
                'invoice_id' => $invoice_id,
                'status' => $response->status(),
                'body' => $response->body()
            ]);

            return [
                'isSuccess' => false,
                'ErrorMessage' => 'Payment status check failed'
            ];

        } catch (Exception $e) {
            Log::error('EPS CheckPaymentStatus exception', [
                'message' => $e->getMessage(),
                'invoice_id' => $invoice_id
            ]);

            return [
                'isSuccess' => false,
                'ErrorMessage' => $e->getMessage()
            ];
        }
    }
}
