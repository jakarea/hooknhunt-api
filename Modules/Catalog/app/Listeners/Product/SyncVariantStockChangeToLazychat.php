<?php

namespace App\Modules\Catalog\Listeners\Product;

use App\Modules\Catalog\Events\Product\VariantStockChanged;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Sync Variant Stock Change to Lazychat Listener (cPanel Friendly - Synchronous)
 *
 * Listens for variant stock changes and sends webhooks immediately with debouncing.
 * This ensures LazyChat catalog stays in sync with actual inventory.
 *
 * @package App\Listeners\Product
 */
class SyncVariantStockChangeToLazychat
{
    private LazychatService $lazychatService;

    public function __construct(LazychatService $lazychatService)
    {
        $this->lazychatService = $lazychatService;
    }

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
        Log::info('Variant stock changed - syncing to LazyChat (sync)', [
            'product_id' => $event->product->id,
            'variant_id' => $event->variant->id,
            'sku' => $event->variant->sku,
            'old_stock' => $event->oldStock,
            'new_stock' => $event->newStock,
            'reason' => $event->reason,
        ]);

        // Create log entry using direct database access
        $logId = DB::table('lazychat_webhook_logs')->insertGetId([
            'product_id' => $event->product->id,
            'event_type' => 'product.stock_updated',
            'webhook_topic' => 'product/update',
            'status' => 'pending',
            'attempts' => 0,
            'payload' => json_encode([
                'reason' => $event->reason,
                'variant_id' => $event->variant->id,
                'sku' => $event->variant->sku,
                'old_stock' => $event->oldStock,
                'new_stock' => $event->newStock,
            ]),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Transform and send webhook immediately (with delay for debouncing)
        $payload = $this->lazychatService->transformProductForLazychat($event->product);

        // Update log
        DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
            'payload' => json_encode($payload),
            'attempts' => 1,
            'last_attempted_at' => now(),
            'updated_at' => now(),
        ]);

        // Send webhook
        $result = $this->lazychatService->sendWebhook('product/update', $payload);

        // Update log based on result
        if ($result['success']) {
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'status' => 'success',
                'response_code' => $result['status_code'] ?? 200,
                'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                'sent_at' => now(),
                'updated_at' => now(),
            ]);

            Log::info('LazyChat webhook sent successfully for stock change (sync)', [
                'product_id' => $event->product->id,
                'variant_id' => $event->variant->id,
                'log_id' => $logId,
            ]);

        } else {
            DB::table('lazychat_webhook_logs')->where('id', $logId)->update([
                'status' => 'failed',
                'response_code' => $result['status_code'] ?? null,
                'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
                'updated_at' => now(),
            ]);

            Log::error('LazyChat webhook failed for stock change (sync)', [
                'product_id' => $event->product->id,
                'variant_id' => $event->variant->id,
                'error' => $result['error'] ?? $result['message'],
            ]);
        }
    }
}
