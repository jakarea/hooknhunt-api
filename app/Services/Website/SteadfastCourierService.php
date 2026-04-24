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

        $debugInfo = [
            'base_url' => $this->baseUrl,
            'url' => "{$this->baseUrl}/create_order",
            'payload' => $payload,
            'headers' => $this->headers(),
            'is_mock' => $this->isMockMode,
        ];

        Log::info('=== STEADFAST API REQUEST START ===');
        Log::info('URL: ' . $debugInfo['url']);
        Log::info('Payload: ' . json_encode($payload));
        Log::info('Headers: ' . json_encode($this->headers()));

        try {
            $httpResponse = Http::withHeaders($this->headers())
                ->withoutVerifying()
                ->post("{$this->baseUrl}/create_order", $payload);

            $statusCode = $httpResponse->status();
            $responseBody = $httpResponse->body();

            Log::info('HTTP Status: ' . $statusCode);
            Log::info('Response Body: ' . (is_string($responseBody) ? $responseBody : json_encode($responseBody)));

            $response = $httpResponse->json();
            Log::info('Decoded Response: ' . json_encode($response));
            Log::info('=== STEADFAST API REQUEST END ===');

            if (isset($response['status']) && $response['status'] == 200) {
                return [
                    'success' => true,
                    'consignment_id' => $response['consignment']['consignment_id'],
                    'tracking_code' => $response['consignment']['tracking_code'],
                    'tracking_link' => $response['consignment']['tracking_link'] ?? null,
                    'message' => 'Order sent to Steadfast successfully',
                ];
            }

            $errorMessage = 'Unknown error from Steadfast API';
            if (isset($response['errors'])) {
                $errors = $response['errors'];
                if (is_array($errors)) {
                    // Check if it's a simple array or nested array
                    $firstValue = reset($errors);
                    if (is_array($firstValue)) {
                        // Nested array - flatten it
                        $flattened = [];
                        array_walk_recursive($errors, function($value) use (&$flattened) {
                            if (is_scalar($value)) {
                                $flattened[] = $value;
                            }
                        });
                        $errorMessage = implode(', ', $flattened);
                    } else {
                        // Simple array of strings
                        $errorMessage = implode(', ', $errors);
                    }
                } else {
                    $errorMessage = $errors;
                }
            } elseif (isset($response['message'])) {
                $errorMessage = $response['message'];
            }

            return [
                'success' => false,
                'message' => $errorMessage,
            ];
        } catch (\Exception $e) {
            $exceptionData = [
                'message' => $e->getMessage(),
                'message_type' => gettype($e->getMessage()),
                'code' => $e->getCode(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ];

            Log::error('=== STEADFAST API EXCEPTION ===');
            Log::error(json_encode($exceptionData));
            Log::error('=== END EXCEPTION ===');

            $errorMessage = 'Connection error';
            $exceptionMessage = $e->getMessage();
            if (is_array($exceptionMessage)) {
                $errorMessage .= ': ' . json_encode($exceptionMessage);
            } elseif (!empty($exceptionMessage)) {
                $errorMessage .= ': ' . $exceptionMessage;
            }

            return [
                'success' => false,
                'message' => $errorMessage,
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
                ->withoutVerifying()
                ->get("{$this->baseUrl}/status_by_trackingcode/{$trackingCode}")
                ->json();

            return is_array($response) ? $response : ['status' => 'error', 'message' => 'Empty response'];
        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();
            if (is_array($errorMessage)) {
                $errorMessage = json_encode($errorMessage);
            }
            Log::error('Steadfast Status Check Error: ' . $errorMessage);
            return ['status' => 'error', 'message' => $errorMessage];
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

        // Format phone for Steadfast: 11 digits, remove +88, spaces, dashes
        $phone = $customerData['phone'] ?? $order->customer?->phone ?? '';
        $phone = preg_replace('/[^0-9]/', '', $phone); // Remove non-digits
        $phone = preg_replace('/^88/', '', $phone); // Remove country code if present

        return [
            'invoice' => $order->invoice_no,
            'recipient_name' => $customerData['name'] ?? $order->customer?->name ?? 'Customer',
            'recipient_phone' => $phone,
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
