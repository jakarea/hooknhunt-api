<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

// Inspiring quote command
Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Lazychat webhook retry command (cPanel-friendly)
Artisan::command('lazychat:retry-webhooks {--max=10 : Maximum number of webhooks to retry} {--older-than=5 : Only retry webhooks older than X minutes}', function () {
    $max = (int) $this->option('max', 10);
    $olderThan = (int) $this->option('older-than', 5);

    $this->info('Starting Lazychat webhook retry...');

    $failedWebhooks = \App\Models\LazychatWebhookLog::where('status', 'failed')
        ->where('attempts', '<', 3)
        ->where(function ($query) use ($olderThan) {
            $query->whereNull('last_attempted_at')
                ->orWhere('last_attempted_at', '<', now()->subMinutes($olderThan));
        })
        ->orderBy('created_at', 'asc')
        ->limit($max)
        ->get();

    if ($failedWebhooks->isEmpty()) {
        $this->info('No failed webhooks to retry.');
        return 0;
    }

    $this->info("Found {$failedWebhooks->count()} failed webhook(s) to retry.");

    $successCount = 0;
    $stillFailingCount = 0;

    foreach ($failedWebhooks as $log) {
        $this->line("Retrying webhook #{$log->id} (Product ID: {$log->product_id})...");

        $log->update([
            'attempts' => $log->attempts + 1,
            'last_attempted_at' => now(),
        ]);

        if ($log->event_type === 'product.deleted') {
            $payload = ['product_id' => (string) $log->product_id];
        } else {
            $product = \App\Models\Product::find($log->product_id);
            if (!$product) {
                $this->warn("  Product #{$log->product_id} not found, skipping.");
                $stillFailingCount++;
                continue;
            }
            $payload = app(\App\Services\ThirdParty\LazychatService::class)->transformProductForLazychat($product);
        }

        $result = app(\App\Services\ThirdParty\LazychatService::class)->sendWebhook($log->webhook_topic, $payload);

        if ($result['success']) {
            $log->update([
                'status' => 'success',
                'response_code' => $result['status_code'] ?? 200,
                'response_body' => json_decode($result['response_body'] ?? '{}', true),
                'error_message' => null,
                'sent_at' => now(),
            ]);
            $this->info("  ✓ Success!");
            $successCount++;
        } else {
            $log->update([
                'status' => 'failed',
                'response_code' => $result['status_code'] ?? null,
                'response_body' => json_decode($result['response_body'] ?? '{}', true),
                'error_message' => $result['error'] ?? $result['message'] ?? 'Unknown error',
            ]);
            $this->error('  ✗ Failed: ' . ($result['error'] ?? $result['message'] ?? 'Unknown error'));
            $stillFailingCount++;
        }

        usleep(500000);
    }

    $this->newLine();
    $this->info("Retry complete:");
    $this->line("  - Successfully sent: {$successCount}");
    $this->line("  - Still failing: {$stillFailingCount}");

    \Illuminate\Support\Facades\Log::info('Lazychat webhook retry completed', [
        'total_retried' => $failedWebhooks->count(),
        'success' => $successCount,
        'failed' => $stillFailingCount,
    ]);

    return 0;
})->purpose('Retry failed Lazychat webhooks (for cPanel cron jobs)')
  ->describe('Retry failed Lazychat webhooks (for cPanel cron jobs)');

// Random queue processor command (cPanel-friendly)
// Processes jobs randomly instead of sequentially
Artisan::command('queue:random {--max=5 : Maximum number of jobs to process} {--queue=lazychat-webhooks,default : Queue names to process (comma-separated)}', function () use (&$command) {
    $maxJobs = (int) $this->option('max', 5);
    $queues = explode(',', $this->option('queue'));

    $this->info("==========================================");
    $this->info(" Random Queue Processor");
    $this->info("==========================================");
    $this->line("Max jobs: {$maxJobs}");
    $this->line("Queues: " . implode(', ', $queues));
    $this->line("");

    $totalJobs = \Illuminate\Support\Facades\DB::table('jobs')
        ->whereIn('queue', $queues)
        ->count();

    if ($totalJobs === 0) {
        $this->warn("No jobs found in queue.");
        return 0;
    }

    $this->info("Total jobs in queue: {$totalJobs}");
    $this->line("");

    $jobsProcessed = 0;
    $jobsFailed = 0;
    $startTime = microtime(true);
    $maxTime = 55;

    while ($jobsProcessed < $maxJobs && $jobsProcessed < $totalJobs) {
        $elapsed = microtime(true) - $startTime;
        if ($elapsed > $maxTime) {
            $this->warn("⏰ Time limit reached ({$maxTime}s)");
            break;
        }

        $job = \Illuminate\Support\Facades\DB::table('jobs')
            ->whereIn('queue', $queues)
            ->inRandomOrder()
            ->first();

        if (!$job) {
            $this->warn("No more jobs to process.");
            break;
        }

        $this->line("Processing job ID: {$job->id} ({$job->queue})...");

        try {
            $exitCode = \Illuminate\Support\Facades\Artisan::call('queue:work', [
                '--once' => true,
                '--queue' => $job->queue,
                '--no-interaction' => true,
            ]);

            if ($exitCode === 0) {
                $jobsProcessed++;
                $this->info("  ✓ Job #{$job->id} processed");
            } else {
                $jobsFailed++;
                $this->error("  ✗ Job #{$job->id} failed");
            }

            usleep(100000);

        } catch (\Exception $e) {
            $jobsFailed++;
            $this->error("  ✗ Exception: " . $e->getMessage());
        }

        $totalJobs = \Illuminate\Support\Facades\DB::table('jobs')
            ->whereIn('queue', $queues)
            ->count();
    }

    $duration = round(microtime(true) - $startTime, 2);

    $this->line("");
    $this->info("==========================================");
    $this->line(" Summary:");
    $this->info("==========================================");
    $this->line("✓ Processed: {$jobsProcessed} jobs");
    $this->line("✗ Failed: {$jobsFailed} jobs");
    $this->line("⏱ Duration: {$duration}s");
    $this->line("📊 Remaining: {$totalJobs} jobs");
    $this->info("==========================================");

    return 0;
})->purpose('Process queue jobs randomly')
  ->describe('Process queue jobs randomly from the job table');
