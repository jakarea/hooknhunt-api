<?php

namespace App\Services;

use App\Models\Courier;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SteadfastService
{
    protected $baseUrl = 'https://portal.packzy.com/api/v1';
    protected $apiKey;
    protected $secretKey;

    public function __construct()
    {
        $courier = Courier::where('name', 'Steadfast')->first();
        $this->apiKey = $courier->api_key ?? null;
        $this->secretKey = $courier->secret_key ?? null;
    }

    /**
     * Create Order
     */
    public function createOrder($order)
    {
        // Mock Mode
        if (empty($this->apiKey) || $this->apiKey === 'TEST_KEY') {
            return [
                'success' => true,
                'tracking_code' => 'SF-MOCK-' . time(),
                'consignment_id' => rand(100000, 999999),
                'msg' => 'Mock Order Placed (Test Mode)'
            ];
        }

        $payload = [
            'invoice' => $order->invoice_no,
            'recipient_name' => $order->customer->name,
            'recipient_phone' => $order->customer->phone,
            'recipient_address' => $order->shipping_address ?? $order->customer->address ?? 'Dhaka',
            'cod_amount' => (float) $order->due_amount,
            'note' => 'Handle with care'
        ];

        try {
            $response = Http::withHeaders([
                'Api-Key' => $this->apiKey,
                'Secret-Key' => $this->secretKey,
                'Content-Type' => 'application/json'
            ])->post("{$this->baseUrl}/create_order", $payload);

            $result = $response->json();

            if (isset($result['status']) && $result['status'] == 200) {
                return [
                    'success' => true,
                    'tracking_code' => $result['consignment']['tracking_code'],
                    'consignment_id' => $result['consignment']['consignment_id'],
                    'msg' => 'Order placed successfully'
                ];
            }

            // Error Handling
            $errorMsg = $result['errors'] ?? 'Unknown Error';
            return [
                'success' => false,
                'msg' => is_array($errorMsg) ? json_encode($errorMsg) : $errorMsg
            ];

        } catch (\Exception $e) {
            Log::error("Steadfast API Error: " . $e->getMessage());
            return [
                'success' => false,
                'msg' => 'Connection Error'
            ];
        }
    }

    /**
     * Check Status
     * Returns Array always.
     */
    public function checkStatus($trackingCode)
    {
        // Mock Mode: Always return 'delivered' for testing purpose
        // (Production এ গেলে 'delivered' এর বদলে 'unknown' বা API কল রাখবেন)
        if (empty($this->apiKey) || $this->apiKey === 'TEST_KEY') {
            return ['delivery_status' => 'delivered'];
        }

        try {
            $response = Http::withHeaders([
                'Api-Key' => $this->apiKey,
                'Secret-Key' => $this->secretKey
            ])->get("{$this->baseUrl}/status_by_trackingcode/{$trackingCode}");

            $data = $response->json();
            
            // যদি API null বা খালি দেয়, ডিফল্ট অ্যারে রিটার্ন করব
            return is_array($data) ? $data : ['status' => 'error', 'msg' => 'Empty response'];

        } catch (\Exception $e) {
            Log::error("Steadfast Status Check Error: " . $e->getMessage());
            return ['status' => 'error', 'msg' => $e->getMessage()];
        }
    }
}