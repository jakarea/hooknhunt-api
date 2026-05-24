<?php

namespace App\Modules\Catalog\Listeners\Product;

use App\Modules\Catalog\Events\Product\ProductCreated;
use App\Modules\Catalog\Events\Product\ProductUpdated;
use App\Modules\Catalog\Events\Product\ProductDeleted;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Sync \App\Modules\Catalog\Models\Product to Lazychat Listener (cPanel Friendly - Synchronous)
 *
 * Listens for product events and sends webhooks immediately (no queue).
 * Compatible with shared cPanel hosting where Supervisor is not available.
 *
 * @package App\Listeners\Product
 */
class SyncProductToLazychat
{
    private LazychatService $lazychatService;

    public function __construct(LazychatService $lazychatService)
    {
        $this->lazychatService = $lazychatService;
    }

    /**
     * Handle product created event.
     *
     * @param ProductCreated $event
     * @return void
     */
    public function handleProductCreated(ProductCreated $event): void
    {
        $this->sendWebhookSynchronously(
            $event->product,
            'product.created',
            'product/create'
        );
    }

    /**
     * Handle product updated event.
     *
     * @param ProductUpdated $event
     * @return void
     */
    public function handleProductUpdated(ProductUpdated $event): void
    {
        $this->sendWebhookSynchronously(
            $event->product,
            'product.updated',
            'product/update'
        );
    }

    /**
     * Handle product deleted event.
     *
     * @param ProductDeleted $event
     * @return void
     */
    public function handleProductDeleted(ProductDeleted $event): void
    {
        $this->sendWebhookSynchronously(
            $event->product,
            'product.deleted',
            'product/delete',
            true // isDelete
        );
    }

    /**
     * Send webhook immediately (synchronous - no queue).
     * cPanel-friendly alternative to queue-based system.
     *
     * @param \App\Models\Product $product
     * @param string $eventType
     * @param string $webhookTopic
     * @param bool $isDelete
     * @return void
     */
    private function sendWebhookSynchronously($product, string $eventType, string $webhookTopic, bool $isDelete = false): void
    {
        // Check if integration is enabled
        if (!Config::get('lazychat.enabled', true)) {
            Log::info('Lazychat integration disabled - skipping webhook', [
                'product_id' => $product->id,
                'event_type' => $eventType,
            ]);
            return;
        }

        // Create log entry using direct database access
        $logId = DB::table('lazychat_webhook_logs')->insertGetId([
            'product_id' => $product->id,
            'event_type' => $eventType,
            'webhook_topic' => $webhookTopic,
            'status' => 'pending',
            'attempts' => 0,
            'payload' => $isDelete ? json_encode(['product_id' => (string) $product->id]) : null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Prepare payload
        if ($isDelete) {
            $payload = ['product_id' => (string) $product->id];
        } else {
            $payload = $this->lazychatService->transformProductForLazychat($product);
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'payload' => json_encode($payload),
                'updated_at' => now(),
            ]);
        }

        // Update log with attempt info
        DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
            'attempts' => 1,
            'last_attempted_at' => now(),
            'updated_at' => now(),
        ]);

        // Send webhook immediately
        $result = $this->lazychatService->sendWebhook($webhookTopic, $payload);

        // Check if skipped (integration disabled)
        if (!empty($result['skipped'])) {
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'status' => 'success',
                'response_code' => null,
                'response_body' => json_encode(['message' => 'Integration disabled']),
                'sent_at' => now(),
                'updated_at' => now(),
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

            Log::info('Lazychat webhook sent successfully (sync)', [
                'product_id' => $product->id,
                'event_type' => $eventType,
                'status_code' => $result['status_code'] ?? 200,
            ]);

        } else {
            // Webhook failed - mark as failed for retry via cron
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'status' => 'failed',
                'response_code' => $result['status_code'] ?? null,
                'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
                'updated_at' => now(),
            ]);

            Log::error('Lazychat webhook failed (sync)', [
                'product_id' => $product->id,
                'event_type' => $eventType,
                'error' => $result['error'] ?? $result['message'],
            ]);
        }
    }
}
