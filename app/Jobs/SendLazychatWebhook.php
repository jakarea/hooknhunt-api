<?php

namespace App\Jobs;

use App\Models\Product;
use App\Services\ThirdParty\LazychatService;
use App\Models\LazychatWebhookLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Queue Job for sending Lazychat webhooks.
 *
 * Handles async webhook delivery with retry logic.
 * Works with database queue driver (compatible with cPanel shared hosting).
 *
 * @package App\Jobs
 */
class SendLazychatWebhook implements ShouldQueue
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

    private Product $product;
    private string $eventType;
    private string $webhookTopic;
    private ?int $webhookLogId;
    private bool $isDelete;

    /**
     * Create a new job instance.
     *
     * @param Product $product The product to sync
     * @param string $eventType Event type (product.created, product.updated, product.deleted)
     * @param string $webhookTopic Webhook topic header (product/create, product/update, product/delete)
     * @param int|null $webhookLogId Optional log ID for updating existing record
     * @param bool $isDelete Whether this is a delete operation (sends minimal payload)
     */
    public function __construct(
        Product $product,
        string $eventType,
        string $webhookTopic,
        ?int $webhookLogId = null,
        bool $isDelete = false
    ) {
        $this->product = $product;
        $this->eventType = $eventType;
        $this->webhookTopic = $webhookTopic;
        $this->webhookLogId = $webhookLogId;
        $this->isDelete = $isDelete;

        // Set queue from config
        $this->onQueue(config('lazychat.queue.queue', 'lazychat-webhooks'));
    }

    /**
     * Execute the job.
     * Sends webhook to Lazychat and updates log.
     *
     * @param LazychatService $lazychatService
     * @return void
     */
    public function handle(LazychatService $lazychatService): void
    {
        // Get or create webhook log
        $log = $this->getOrCreateLog();

        try {
            // For delete operations, use minimal payload
            if ($this->isDelete) {
                $payload = ['product_id' => (string) $this->product->id];
                $result = $lazychatService->sendWebhook($this->webhookTopic, $payload);
            } else {
                // Transform product to Lazychat format
                $payload = $lazychatService->transformProductForLazychat($this->product);
                $result = $lazychatService->sendWebhook($this->webhookTopic, $payload);
            }

            // Update log with payload
            $log->update([
                'payload' => $payload,
                'last_attempted_at' => now(),
                'attempts' => $log->attempts + 1,
                'job_id' => $this->job?->getJobId(),
            ]);

            // Send webhook
            $result = $lazychatService->sendWebhook($this->webhookTopic, $payload);

            // Check if skipped (integration disabled)
            if (!empty($result['skipped'])) {
                $log->update([
                    'status' => 'success',
                    'response_code' => null,
                    'response_body' => ['message' => 'Integration disabled'],
                    'sent_at' => now(),
                ]);

                Log::info('Lazychat webhook skipped', [
                    'product_id' => $this->product->id,
                    'event_type' => $this->eventType,
                ]);

                return;
            }

            // Update log based on result
            if ($result['success']) {
                $log->update([
                    'status' => 'success',
                    'response_code' => $result['status_code'] ?? 200,
                    'response_body' => json_decode($result['response_body'] ?? '{}', true),
                    'sent_at' => now(),
                ]);

                Log::info('Lazychat webhook sent successfully', [
                    'product_id' => $this->product->id,
                    'event_type' => $this->eventType,
                    'attempt' => $log->attempts,
                ]);

            } else {
                // Webhook failed - check if we should retry
                if ($this->attempts() < $this->tries) {
                    // Schedule retry
                    $log->update([
                        'status' => 'pending',
                        'response_code' => $result['status_code'] ?? null,
                        'response_body' => json_decode($result['response_body'] ?? '{}', true),
                        'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
                        'retry_after' => now()->addSeconds($this->backoff),
                    ]);

                    Log::warning('Lazychat webhook failed, will retry', [
                        'product_id' => $this->product->id,
                        'event_type' => $this->eventType,
                        'attempt' => $this->attempts(),
                        'error' => $result['error'] ?? $result['message'],
                    ]);

                    // Release back to queue with delay
                    $this->release($this->backoff);

                } else {
                    // Max retries reached - mark as failed
                    $log->update([
                        'status' => 'failed',
                        'response_code' => $result['status_code'] ?? null,
                        'response_body' => json_decode($result['response_body'] ?? '{}', true),
                        'error_message' => $result['error'] ?? $result['message'] ?? 'Max retries reached',
                    ]);

                    Log::error('Lazychat webhook failed permanently', [
                        'product_id' => $this->product->id,
                        'event_type' => $this->eventType,
                        'attempts' => $this->attempts(),
                        'error' => $result['error'] ?? $result['message'],
                    ]);

                    // Notify admin of permanent failure
                    $this->notifyAdminFailure($log);
                }
            }

        } catch (Exception $e) {
            Log::error('Lazychat webhook job exception', [
                'product_id' => $this->product->id,
                'event_type' => $this->eventType,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            // Update log with error
            $log->update([
                'status' => 'failed',
                'error_message' => 'Job exception: ' . $e->getMessage(),
                'last_attempted_at' => now(),
                'attempts' => $log->attempts + 1,
            ]);

            // Mark job as failed if max retries reached
            if ($this->attempts() >= $this->tries) {
                $this->notifyAdminFailure($log);
            }
        }
    }

    /**
     * Get or create webhook log entry.
     *
     * @return LazychatWebhookLog
     */
    private function getOrCreateLog(): LazychatWebhookLog
    {
        if ($this->webhookLogId) {
            return LazychatWebhookLog::findOrFail($this->webhookLogId);
        }

        return LazychatWebhookLog::create([
            'product_id' => $this->product->id,
            'event_type' => $this->eventType,
            'webhook_topic' => $this->webhookTopic,
            'status' => 'pending',
            'attempts' => 0,
        ]);
    }

    /**
     * Notify admin of permanent webhook failure.
     * For now, stores in database log - admin can query via API.
     * Can be enhanced with email or other notifications.
     *
     * @param LazychatWebhookLog $log
     * @return void
     */
    private function notifyAdminFailure(LazychatWebhookLog $log): void
    {
        // Store failure notification in log metadata
        $log->update([
            'metadata' => array_merge($log->metadata ?? [], [
                'admin_notified' => true,
                'notified_at' => now()->toIso8601String(),
                'notification_type' => 'database_log',
            ]),
        ]);

        // Log for admin dashboard to query
        Log::warning('Lazychat webhook failure - admin notification', [
            'log_id' => $log->id,
            'product_id' => $this->product->id,
            'event_type' => $this->eventType,
            'error' => $log->error_message,
            'attempts' => $log->attempts,
        ]);
    }

    /**
     * Handle a job failure.
     *
     * @param Exception $exception
     * @return void
     */
    public function failed(Exception $exception): void
    {
        Log::error('Lazychat webhook job failed permanently', [
            'product_id' => $this->product->id,
            'event_type' => $this->eventType,
            'error' => $exception->getMessage(),
        ]);
    }
}
