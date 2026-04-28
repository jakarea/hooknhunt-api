<?php

namespace App\Listeners\Product;

use App\Events\Product\ProductCreated;
use App\Events\Product\ProductUpdated;
use App\Events\Product\ProductDeleted;
use App\Jobs\SendLazychatWebhook;
use App\Models\LazychatWebhookLog;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

/**
 * Sync Product to Lazychat Listener
 *
 * Listens for product events and dispatches webhook jobs.
 * Works asynchronously via Laravel queues (database driver).
 *
 * @package App\Listeners\Product
 */
class SyncProductToLazychat
{
    /**
     * Handle product created event.
     *
     * @param ProductCreated $event
     * @return void
     */
    public function handleProductCreated(ProductCreated $event): void
    {
        $this->dispatchWebhookJob(
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
        $this->dispatchWebhookJob(
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
        // Check if integration is enabled
        if (!Config::get('lazychat.enabled', true)) {
            Log::info('Lazychat integration disabled - skipping delete webhook', [
                'product_id' => $event->product->id,
            ]);
            return;
        }

        // Create log entry for delete webhook
        $log = LazychatWebhookLog::create([
            'product_id' => $event->product->id,
            'event_type' => 'product.deleted',
            'webhook_topic' => 'product/delete',
            'status' => 'pending',
            'attempts' => 0,
            'payload' => ['product_id' => (string) $event->product->id],
        ]);

        // Dispatch delete webhook job with product_id only
        dispatch(new SendLazychatWebhook(
            $event->product,
            'product.deleted',
            'product/delete',
            $log->id,
            true // isDelete flag
        ));

        Log::info('Lazychat delete webhook job dispatched', [
            'product_id' => $event->product->id,
            'log_id' => $log->id,
        ]);
    }

    /**
     * Dispatch webhook job to queue.
     *
     * @param \App\Models\Product $product
     * @param string $eventType
     * @param string $webhookTopic
     * @return void
     */
    private function dispatchWebhookJob($product, string $eventType, string $webhookTopic): void
    {
        // Check if integration is enabled
        if (!Config::get('lazychat.enabled', true)) {
            Log::info('Lazychat integration disabled - skipping webhook', [
                'product_id' => $product->id,
                'event_type' => $eventType,
            ]);
            return;
        }

        // Create initial log entry
        $log = LazychatWebhookLog::create([
            'product_id' => $product->id,
            'event_type' => $eventType,
            'webhook_topic' => $webhookTopic,
            'status' => 'pending',
            'attempts' => 0,
        ]);

        // Dispatch job to queue
        dispatch(new SendLazychatWebhook(
            $product,
            $eventType,
            $webhookTopic,
            $log->id
        ));

        Log::info('Lazychat webhook job dispatched', [
            'product_id' => $product->id,
            'event_type' => $eventType,
            'webhook_topic' => $webhookTopic,
            'log_id' => $log->id,
        ]);
    }
}
