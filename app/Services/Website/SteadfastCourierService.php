<?php

namespace App\Services\Website;

use App\Models\Website\WebsiteOrder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Self-contained Steadfast Courier API wrapper for the Website module.
 * Reads credentials from environment or .env configuration.
 */
class SteadfastCourierService
{
    private string $baseUrl;
    private string $apiKey;
    private string $secretKey;
    private bool $isMockMode;

    public function __construct()
    {
        $this->baseUrl = config('services.steadfast.url', 'https://portal.packzy.com/api/v1');
        $this->apiKey = config('services.steadfast.api_key', '');
        $this->secretKey = config('services.steadfast.secret_key', '');
        $this->isMockMode = empty($this->apiKey) || $this->apiKey === 'TEST_KEY';
    }

    /**
     * Create a consignment/order in Steadfast.
     */
    public function createOrder(WebsiteOrder $order): array
    {
        if ($this->isMockMode) {
            return $this->mockCreateOrder($order);
        }

        $payload = $this->buildPayload($order);

        try {
            $response = Http::withHeaders($this->headers())
                ->post("{$this->baseUrl}/create_order", $payload)
                ->json();

            if (isset($response['status']) && $response['status'] == 200) {
                return [
                    'success' => true,
                    'consignment_id' => $response['consignment']['consignment_id'],
                    'tracking_code' => $response['consignment']['tracking_code'],
                    'message' => 'Order sent to Steadfast successfully',
                ];
            }

            return [
                'success' => false,
                'message' => $response['errors'] ?? 'Unknown error from Steadfast API',
            ];
        } catch (\Exception $e) {
            Log::error('Steadfast API Error: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Connection error: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Check delivery status by tracking code.
     */
    public function checkStatus(string $trackingCode): array
    {
        if ($this->isMockMode) {
            return ['delivery_status' => 'delivered'];
        }

        try {
            $response = Http::withHeaders($this->headers())
                ->get("{$this->baseUrl}/status_by_trackingcode/{$trackingCode}")
                ->json();

            return is_array($response) ? $response : ['status' => 'error', 'message' => 'Empty response'];
        } catch (\Exception $e) {
            Log::error('Steadfast Status Check Error: ' . $e->getMessage());
            return ['status' => 'error', 'message' => $e->getMessage()];
        }
    }

    /**
     * Sync delivery status for a single order.
     */
    public function syncOrderStatus(WebsiteOrder $order): array
    {
        if (!$order->tracking_code) {
            return ['success' => false, 'message' => 'No tracking code found'];
        }

        $result = $this->checkStatus($order->tracking_code);

        if (isset($result['delivery_status'])) {
            $order->delivery_status = $result['delivery_status'];
            $order->save();

            return [
                'success' => true,
                'delivery_status' => $result['delivery_status'],
            ];
        }

        return ['success' => false, 'message' => $result['message'] ?? 'Unknown error'];
    }

    /**
     * Build the API payload from an order.
     */
    private function buildPayload(WebsiteOrder $order): array
    {
        $customerData = $order->getCustomerData();
        $shippingData = $order->getShippingData();

        return [
            'invoice' => $order->invoice_no,
            'recipient_name' => $customerData['name'] ?? $order->customer?->name ?? 'Customer',
            'recipient_phone' => $customerData['phone'] ?? $order->customer?->phone ?? '',
            'recipient_address' => trim(implode(', ', array_filter([
                $shippingData['address'] ?? '',
                $shippingData['thana'] ?? '',
                $shippingData['district'] ?? '',
                $shippingData['division'] ?? '',
            ]))),
            'cod_amount' => (float) $order->due_amount > 0 ? (float) $order->due_amount : 0,
            'note' => $order->note ?? 'Handle with care',
            'weight' => (float) ($order->total_weight ?? 0.5),
        ];
    }

    /**
     * Mock response for testing without API keys.
     */
    private function mockCreateOrder(WebsiteOrder $order): array
    {
        return [
            'success' => true,
            'consignment_id' => 'SF-MOCK-' . $order->id,
            'tracking_code' => 'SF' . strtoupper(uniqid()),
            'message' => 'Mock order created (Test Mode)',
        ];
    }

    private function headers(): array
    {
        return [
            'Api-Key' => $this->apiKey,
            'Secret-Key' => $this->secretKey,
            'Content-Type' => 'application/json',
        ];
    }
}
