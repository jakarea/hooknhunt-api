<?php

namespace App\Listeners\Product;

use App\Events\Product\ProductCreated;
use App\Events\Product\ProductUpdated;
use App\Events\Product\ProductDeleted;
use App\Models\LazychatWebhookLog;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

/**
 * Sync Product to Lazychat Listener (cPanel Friendly - Synchronous)
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

        // Create log entry
        $log = LazychatWebhookLog::create([
            'product_id' => $product->id,
            'event_type' => $eventType,
            'webhook_topic' => $webhookTopic,
            'status' => 'pending',
            'attempts' => 0,
            'payload' => $isDelete ? ['product_id' => (string) $product->id] : null,
        ]);

        // Prepare payload
        if ($isDelete) {
            $payload = ['product_id' => (string) $product->id];
        } else {
            $payload = $this->lazychatService->transformProductForLazychat($product);
            $log->update(['payload' => $payload]);
        }

        // Update log with attempt info
        $log->update([
            'attempts' => 1,
            'last_attempted_at' => now(),
        ]);

        // Send webhook immediately
        $result = $this->lazychatService->sendWebhook($webhookTopic, $payload);

        // Check if skipped (integration disabled)
        if (!empty($result['skipped'])) {
            $log->update([
                'status' => 'success',
                'response_code' => null,
                'response_body' => ['message' => 'Integration disabled'],
                'sent_at' => now(),
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

            Log::info('Lazychat webhook sent successfully (sync)', [
                'product_id' => $product->id,
                'event_type' => $eventType,
                'status_code' => $result['status_code'] ?? 200,
            ]);

        } else {
            // Webhook failed - mark as failed for retry via cron
            $log->update([
                'status' => 'failed',
                'response_code' => $result['status_code'] ?? null,
                'response_body' => json_decode($result['response_body'] ?? '{}', true),
                'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
            ]);

            Log::error('Lazychat webhook failed (sync)', [
                'product_id' => $product->id,
                'event_type' => $eventType,
                'error' => $result['error'] ?? $result['message'],
            ]);
        }
    }
}
