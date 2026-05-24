<?php

namespace App\Modules\Catalog\Commands;

use App\Services\ThirdParty\LazychatService;
use App\Modules\Catalog\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Retry Failed Lazychat Webhooks Command
 *
 * cPanel-friendly alternative to queue workers.
 * Run this command via cron job to retry failed webhooks.
 * Uses direct database access for module independence.
 *
 * Usage:
 *   php artisan lazychat:retry-webhooks
 *
 * Cron setup (add to cPanel cron jobs):
 *   */5 * * * * php /path/to/artisan lazychat:retry-webhooks
 *
 * @package App\Modules\Catalog\Commands
 */
class RetryLazychatWebhooks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'lazychat:retry-webhooks
                            {--max=10 : Maximum number of webhooks to retry}
                            {--older-than=5 : Only retry webhooks older than X minutes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Retry failed Lazychat webhooks (cPanel-friendly alternative to queue workers)';

    private LazychatService $lazychatService;

    /**
     * Create a new command instance.
     */
    public function __construct(LazychatService $lazychatService)
    {
        parent::__construct();
        $this->lazychatService = $lazychatService;
    }

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle(): int
    {
        $this->info('Starting Lazychat webhook retry...');

        $maxRetries = (int) $this->option('max');
        $olderThanMinutes = (int) $this->option('older-than');

        // Get failed webhooks using direct database access for module independence
        $failedWebhooks = DB::table('lazychat_webhook_logs')
            ->where('status', 'failed')
            ->where('attempts', '<', 3) // Max 3 attempts
            ->where(function ($query) use ($olderThanMinutes) {
                $query->whereNull('last_attempted_at')
                    ->orWhere('last_attempted_at', '<', now()->subMinutes($olderThanMinutes));
            })
            ->orderBy('created_at', 'asc')
            ->limit($maxRetries)
            ->get();

        if ($failedWebhooks->isEmpty()) {
            $this->info('No failed webhooks to retry.');
            return Command::SUCCESS;
        }

        $this->info("Found {$failedWebhooks->count()} failed webhook(s) to retry.");

        $successCount = 0;
        $stillFailingCount = 0;

        foreach ($failedWebhooks as $log) {
            $this->line("Retrying webhook #{$log->id} (Product ID: {$log->product_id}, Event: {$log->event_type})...");

            // Update log before retry using direct database access
            DB::table('lazychat_webhook_logs')->where('id', $log->id)->update([
                'attempts' => $log->attempts + 1,
                'last_attempted_at' => now(),
                'updated_at' => now(),
            ]);

            // Determine payload based on event type
            if ($log->event_type === 'product.deleted') {
                $payload = ['product_id' => (string) $log->product_id];
            } else {
                // Get product using direct database access
                $product = DB::table('products')->where('id', $log->product_id)->first();
                if (!$product) {
                    $this->warn("  Product #{$log->product_id} not found, skipping.");
                    DB::table('lazychat_webhook_logs')->where('id', $log->id)->update([
                        'error_message' => 'Product not found (possibly deleted)',
                        'updated_at' => now(),
                    ]);
                    $stillFailingCount++;
                    continue;
                }

                // Transform product data to Lazychat format
                $payload = $this->lazychatService->transformProductForLazychat(
                    Product::find($product->id) // Need to use model for transformation
                );
            }

            // Send webhook
            $result = $this->lazychatService->sendWebhook($log->webhook_topic, $payload);

            // Update log based on result using direct database access
            if ($result['success']) {
                DB::table('lazychat_webhook_logs')->where('id', $log->id)->update([
                    'status' => 'success',
                    'response_code' => $result['status_code'] ?? 200,
                    'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                    'error_message' => null,
                    'sent_at' => now(),
                    'updated_at' => now(),
                ]);

                $this->info("  ✓ Webhook sent successfully!");
                $successCount++;
            } else {
                DB::table('lazychat_webhook_logs')->where('id', $log->id)->update([
                    'status' => 'failed',
                    'response_code' => $result['status_code'] ?? null,
                    'response_body' => json_encode(json_decode($result['response_body'] ?? '{}', true)),
                    'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
                    'updated_at' => now(),
                ]);

                $this->error("  ✗ Webhook failed: {$result['error'] ?? $result['message']}");
                $stillFailingCount++;
            }

            // Small delay between requests to avoid rate limiting
            usleep(500000); // 0.5 seconds
        }

        $this->newLine();
        $this->info("Retry complete:");
        $this->line("  - Successfully sent: {$successCount}");
        $this->line("  - Still failing: {$stillFailingCount}");

        // Log summary
        Log::info('Lazychat webhook retry completed', [
            'total_retried' => $failedWebhooks->count(),
            'success' => $successCount,
            'failed' => $stillFailingCount,
        ]);

        return Command::SUCCESS;
    }
}