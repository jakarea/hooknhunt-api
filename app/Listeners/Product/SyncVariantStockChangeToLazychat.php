<?php

namespace App\Listeners\Product;

use App\Events\Product\VariantStockChanged;
use App\Events\Product\ProductUpdated;
use App\Jobs\SendLazychatWebhook;
use App\Models\LazychatWebhookLog;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Sync Variant Stock Change to Lazychat Listener
 *
 * Listens for variant stock changes and dispatches ProductUpdated webhook.
 * This ensures LazyChat catalog stays in sync with actual inventory.
 *
 * @package App\Listeners\Product
 */
class SyncVariantStockChangeToLazychat
{
    /**
     * Handle variant stock changed event.
     *
     * Uses debouncing to prevent duplicate webhooks when multiple variants
     * of the same product are updated within a short time window.
     *
     * @param VariantStockChanged $event
     * @return void
     */
    public function handle(VariantStockChanged $event): void
    {
        // Check if integration is enabled
        if (!Config::get('lazychat.enabled', true)) {
            Log::info('Lazychat integration disabled - skipping variant stock sync', [
                'product_id' => $event->product->id,
                'variant_id' => $event->variant->id,
            ]);
            return;
        }

        // Debounce key for this product
        $debounceKey = "lazychat:stock_sync:{$event->product->id}";

        // Check if there's already a pending sync for this product (within 5 seconds)
        if (Cache::has($debounceKey)) {
            Log::info('LazyChat stock sync already pending for product - skipping', [
                'product_id' => $event->product->id,
                'variant_id' => $event->variant->id,
            ]);

            // Update cache to extend the debounce window
            Cache::put($debounceKey, true, now()->addSeconds(5));
            return;
        }

        // Set debounce flag for 5 seconds
        Cache::put($debounceKey, true, now()->addSeconds(5));

        // Log the stock change
        Log::info('Variant stock changed - syncing to LazyChat', [
            'product_id' => $event->product->id,
            'variant_id' => $event->variant->id,
            'sku' => $event->variant->sku,
            'old_stock' => $event->oldStock,
            'new_stock' => $event->newStock,
            'reason' => $event->reason,
        ]);

        // Create log entry
        $log = LazychatWebhookLog::create([
            'product_id' => $event->product->id,
            'event_type' => 'product.stock_updated',
            'webhook_topic' => 'product/update',
            'status' => 'pending',
            'attempts' => 0,
            'payload' => [
                'reason' => $event->reason,
                'variant_id' => $event->variant->id,
                'sku' => $event->variant->sku,
                'old_stock' => $event->oldStock,
                'new_stock' => $event->newStock,
            ],
        ]);

        // Dispatch webhook job with product (will trigger ProductUpdated to LazyChat)
        dispatch(new SendLazychatWebhook(
            $event->product,
            'product.stock_updated',
            'product/update',
            $log->id
        ))->delay(now()->addSeconds(5)); // Delay by 5 seconds to accumulate more changes

        Log::info('LazyChat webhook job dispatched for variant stock change (with debounce)', [
            'product_id' => $event->product->id,
            'variant_id' => $event->variant->id,
            'log_id' => $log->id,
            'delayed_by' => '5 seconds',
        ]);
    }
}
