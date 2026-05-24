<?php

namespace App\Modules\Website\Jobs;

use App\Modules\Website\Models\WebsiteOrder;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Queue Job for sending Order webhooks to Lazychat.
 *
 * Handles async webhook delivery with retry logic.
 * Works with database queue driver (compatible with cPanel shared hosting).
 *
 * @package App\Jobs
 */
class SendOrderLazychatWebhook implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Maximum number of attempts for this job.
     */
    public int $tries = 3;

    /**
     * Number of seconds to wait before retrying.
     */
    public int $backoff = 30;

    /**
     * The number of seconds the job can run before timing out.
     */
    public int $timeout = 15;

    private \App\Modules\Website\Models\WebsiteOrder $order;
    private string $eventType;
    private ?string $transactionId;
    private ?string $reason;
    private ?string $courierName;
    private ?string $courierPartner;
    private ?string $trackingUrl;

    /**
     * Create a new job instance.
     *
     * @param \App\Modules\Website\Models\WebsiteOrder $order The order to sync
     * @param string $eventType Event type (order.created, order.paid, order.failed, order.cancelled, order.shipped)
     * @param string|null $transactionId \App\Modules\Finance\Models\Payment transaction ID (for paid orders) or tracking number (for shipped)
     * @param string|null $reason Failure/cancellation reason
     * @param string|null $courierName Courier name (for shipped orders)
     * @param string|null $courierPartner Courier partner (for shipped orders)
     * @param string|null $trackingUrl Tracking URL (for shipped orders)
     */
    public function __construct(
        \App\Modules\Website\Models\WebsiteOrder $order,
        string $eventType,
        ?string $transactionId = null,
        ?string $reason = null,
        ?string $courierName = null,
        ?string $courierPartner = null,
        ?string $trackingUrl = null
    ) {
        $this->order = $order;
        $this->eventType = $eventType;
        $this->transactionId = $transactionId;
        $this->reason = $reason;
        $this->courierName = $courierName;
        $this->courierPartner = $courierPartner;
        $this->trackingUrl = $trackingUrl;

        // Set queue from config (same as product webhooks)
        $this->onQueue(config('lazychat.queue.queue', 'lazychat-webhooks'));
    }

    /**
     * Execute the job.
     * Sends webhook to Lazychat.
     *
     * @param LazychatService $lazychatService
     * @return void
     */
    public function handle(LazychatService $lazychatService): void
    {
        try {
            // Transform order to Lazychat format
            $payload = $lazychatService->transformOrderForLazychat($this->order);

            // Add event-specific fields
            $payload['event_type'] = $this->eventType;

            // Add payment-specific fields for paid/failed events
            if ($this->eventType === 'order.paid') {
                $payload['payment'] = array_merge($payload['payment'] ?? [], [
                    'transaction_id' => $this->transactionId,
                    'payment_method' => $this->getPaymentMethod(),
                    'payment_gateway' => $this->getPaymentGateway(),
                    'paid_at' => now()->toIso8601String(),
                    'amount' => (float) $this->order->paid_amount,
                    'currency' => 'BDT',
                ]);
            }

            // Add failure-specific fields for failed events
            if ($this->eventType === 'order.failed') {
                $payload['payment'] = array_merge($payload['payment'] ?? [], [
                    'failed_at' => now()->toIso8601String(),
                    'failure_reason' => $this->reason,
                    'error_code' => $this->reason, // Using reason as error code for now
                ]);
            }

            // Add shipping-specific fields for shipped events
            if ($this->eventType === 'order.shipped') {
                $payload['shipping'] = array_merge($payload['shipping'] ?? [], [
                    'tracking_number' => $this->transactionId, // Using transactionId as tracking number
                    'courier_name' => $this->courierName ?? 'Steadfast',
                    'courier_partner' => $this->courierPartner ?? 'Packzy',
                    'tracking_url' => $this->trackingUrl,
                    'shipped_at' => now()->toIso8601String(),
                ]);
            }

            // Add transaction ID if available
            if ($this->transactionId) {
                $payload['transaction_id'] = $this->transactionId;
            }

            // Add failure reason if available
            if ($this->reason) {
                $payload['reason'] = $this->reason;
            }

            // Determine webhook topic based on event type
            $webhookTopic = match($this->eventType) {
                'order.created' => 'order/create',
                'order.paid' => 'order/paid',
                'order.failed' => 'order/failed',
                'order.shipped' => 'order/shipped',
                'order.cancelled' => 'order/cancelled',
                default => 'order/update',
            };

            // Send webhook
            $result = $lazychatService->sendOrderWebhook($webhookTopic, $payload);

            // Check if skipped (integration disabled)
            if (!empty($result['skipped'])) {
                Log::info('Lazychat order webhook skipped', [
                    'order_id' => $this->order->id,
                    'invoice_no' => $this->order->invoice_no,
                    'event_type' => $this->eventType,
                ]);
                return;
            }

            // Handle result
            if ($result['success']) {
                Log::info('Lazychat order webhook sent successfully', [
                    'order_id' => $this->order->id,
                    'invoice_no' => $this->order->invoice_no,
                    'event_type' => $this->eventType,
                    'status_code' => $result['status_code'] ?? 200,
                ]);
            } else {
                // Webhook failed - check if we should retry
                if ($this->attempts() < $this->tries) {
                    Log::warning('Lazychat order webhook failed, will retry', [
                        'order_id' => $this->order->id,
                        'event_type' => $this->eventType,
                        'attempt' => $this->attempts(),
                        'error' => $result['error'] ?? $result['message'] ?? 'Unknown error',
                    ]);
                    // Release back to queue with delay
                    $this->release($this->backoff);
                } else {
                    // Max retries reached - log permanent failure
                    Log::error('Lazychat order webhook failed permanently', [
                        'order_id' => $this->order->id,
                        'event_type' => $this->eventType,
                        'attempts' => $this->attempts(),
                        'error' => $result['error'] ?? $result['message'],
                    ]);
                }
            }

        } catch (Exception $e) {
            Log::error('Lazychat order webhook job exception', [
                'order_id' => $this->order->id,
                'event_type' => $this->eventType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Retry if not max attempts
            if ($this->attempts() < $this->tries) {
                $this->release($this->backoff);
            }
        }
    }

    /**
     * Handle a job failure.
     *
     * @param Exception $exception
     * @return void
     */
    public function failed(Exception $exception): void
    {
        Log::error('Lazychat order webhook job failed permanently', [
            'order_id' => $this->order->id,
            'event_type' => $this->eventType,
            'error' => $exception->getMessage(),
        ]);
    }

    /**
     * Get payment method from order external_data.
     *
     * @return string
     */
    private function getPaymentMethod(): string
    {
        $externalData = $this->order->external_data ?? [];
        return $externalData['payment']['method'] ?? 'cod';
    }

    /**
     * Get payment gateway name from payment method.
     *
     * @return string
     */
    private function getPaymentGateway(): string
    {
        $method = $this->getPaymentMethod();

        return match($method) {
            'eps' => 'EPS Payment Gateway',
            'sslcommerz' => 'SSLCommerz',
            'cod' => 'Cash on Delivery',
            'bkash' => 'bKash',
            'nagad' => 'Nagad',
            default => ucfirst($method),
        };
    }
}
