<?php

namespace App\Modules\Catalog\Jobs;

use App\Modules\Catalog\Models\Product;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Queue Job for sending Lazychat webhooks.
 *
 * Handles async webhook delivery with retry logic.
 * Works with database queue driver (compatible with cPanel shared hosting).
 * Uses direct database access for module independence.
 *
 * @package App\Modules\Catalog\Jobs
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
    private bool $isDelete = false;

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
        // Get or create webhook log using direct database access
        $logId = $this->getOrCreateLogId();

        try {
            // For delete operations, use minimal payload
            if ($this->isDelete) {
                $webhookPayload = ['product_id' => (string) $this->product->id];
                $payload = ['payload' => $webhookPayload];
                $result = $lazychatService->sendWebhook($this->webhookTopic, $payload);
            } else {
                // Transform product to Lazychat format
                $productData = $lazychatService->transformProductForLazychat($this->product);
                $payload = ['payload' => $productData];
                $result = $lazychatService->sendWebhook($this->webhookTopic, $payload);
            }

            // Update log with payload using direct database access
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'payload' => json_encode($payload),
                'last_attempted_at' => now(),
                'attempts' => DB::raw('attempts + 1'),
                'job_id' => $this->job?->getJobId(),
                'updated_at' => now(),
            ]);

            // Get current attempts for retry logic
            $logData = DB::table('lazychat_webhook_logs')->where('id', $logId)->first();
            $currentAttempts = $logData->attempts ?? 1;

            // Check if skipped (integration disabled)
            if (!empty($result['skipped'])) {
                DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                    'status' => 'success',
                    'response_code' => null,
                    'response_body' => json_encode(['message' => 'Integration disabled']),
                    'sent_at' => now(),
                    'updated_at' => now(),
                ]);

                Log::info('Lazychat webhook skipped', [
                    'product_id' => $this->product->id,
                    'event_type' => $this->eventType,
                ]);

                return;
            }

            // Update log based on result
            if ($result['success']) {
                DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                    'status' => 'success',
                    'response_code' => $result['status_code'] ?? 200,
                    'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                    'sent_at' => now(),
                    'updated_at' => now(),
                ]);

                Log::info('Lazychat webhook sent successfully', [
                    'product_id' => $this->product->id,
                    'event_type' => $this->eventType,
                    'attempt' => $currentAttempts,
                ]);

            } else {
                // Webhook failed - check if we should retry
                if ($currentAttempts < $this->tries) {
                    // Schedule retry
                    DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                        'status' => 'pending',
                        'response_code' => $result['status_code'] ?? null,
                        'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                        'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
                        'retry_after' => now()->addSeconds($this->backoff),
                        'updated_at' => now(),
                    ]);

                    Log::warning('Lazychat webhook failed, will retry', [
                        'product_id' => $this->product->id,
                        'event_type' => $this->eventType,
                        'attempt' => $currentAttempts,
                        'error' => $result['error'] ?? $result['message'],
                    ]);

                    // Release back to queue with delay
                    $this->release($this->backoff);

                } else {
                    // Max retries reached - mark as failed
                    DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                        'status' => 'failed',
                        'response_code' => $result['status_code'] ?? null,
                        'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                        'error_message' => $result['error'] ?? $result['message'] ?? 'Max retries reached',
                        'updated_at' => now(),
                    ]);

                    Log::error('Lazychat webhook failed permanently', [
                        'product_id' => $this->product->id,
                        'event_type' => $this->eventType,
                        'attempts' => $currentAttempts,
                        'error' => $result['error'] ?? $result['message'],
                    ]);

                    // Notify admin of permanent failure
                    $this->notifyAdminFailure($logId);
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
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'status' => 'failed',
                'error_message' => 'Job exception: ' . $e->getMessage(),
                'last_attempted_at' => now(),
                'attempts' => DB::raw('attempts + 1'),
                'updated_at' => now(),
            ]);

            // Mark job as failed if max retries reached
            if ($currentAttempts >= $this->tries) {
                $this->notifyAdminFailure($logId);
            }
        }
    }

    /**
     * Get or create webhook log entry ID using direct database access.
     *
     * @return int
     */
    private function getOrCreateLogId(): int
    {
        if ($this->webhookLogId) {
            return $this->webhookLogId;
        }

        return DB::table('lazychat_webhook_logs')->insertGetId([
            'product_id' => $this->product->id,
            'event_type' => $this->eventType,
            'webhook_topic' => $this->webhookTopic,
            'status' => 'pending',
            'attempts' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Notify admin of permanent webhook failure.
     * For now, stores in database log - admin can query via API.
     * Can be enhanced with email or other notifications.
     *
     * @param int $logId
     * @return void
     */
    private function notifyAdminFailure(int $logId): void
    {
        // Get current log data
        $log = DB::table('lazychat_webhook_logs')->where('id', $logId)->first();

        // Store failure notification in log metadata
        $metadata = json_decode($log->metadata ?? '[]', true);
        $metadata['admin_notified'] = true;
        $metadata['notified_at'] = now()->toIso8601String();
        $metadata['notification_type'] = 'database_log';

        DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
            'metadata' => json_encode($metadata),
            'updated_at' => now(),
        ]);

        // Log for admin dashboard to query
        Log::warning('Lazychat webhook failure - admin notification', [
            'log_id' => $logId,
            'product_id' => $this->product->id,
            'event_type' => $this->eventType,
            'error' => $log->error_message ?? 'Unknown',
            'attempts' => $log->attempts ?? 0,
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