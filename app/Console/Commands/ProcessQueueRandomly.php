<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * Process Queue Jobs Randomly
 *
 * Processes jobs from the queue table in random order.
 * Better for cPanel where continuous workers can't run.
 *
 * Usage: php artisan queue:random
 */
class ProcessQueueRandomly extends Command
{
    protected $signature = 'queue:random {--max=5 : Maximum number of jobs to process} {--queue=lazychat-webhooks,default : Queue names to process (comma-separated)}';

    protected $description = 'Process queue jobs randomly from the job table';

    public function handle()
    {
        $maxJobs = (int) $this->option('max', 5);
        $queues = explode(',', $this->option('queue'));

        $this->info("==========================================");
        $this->info(" Random Queue Processor");
        $this->info("==========================================");
        $this->line("Max jobs: {$maxJobs}");
        $this->line("Queues: " . implode(', ', $queues));
        $this->line("");

        $totalJobs = DB::table('jobs')
            ->whereIn('queue', $queues)
            ->count();

        if ($totalJobs === 0) {
            $this->warn("No jobs found in queue.");
            return Command::SUCCESS;
        }

        $this->info("Total jobs in queue: {$totalJobs}");
        $this->line("");

        $jobsProcessed = 0;
        $jobsFailed = 0;
        $startTime = microtime(true);
        $maxTime = 55; // 55 seconds max

        while ($jobsProcessed < $maxJobs && $jobsProcessed < $totalJobs) {
            // Check time limit
            $elapsed = microtime(true) - $startTime;
            if ($elapsed > $maxTime) {
                $this->warn("⏰ Time limit reached ({$maxTime}s)");
                break;
            }

            // Get a random job from the queue
            $job = DB::table('jobs')
                ->whereIn('queue', $queues)
                ->inRandomOrder()
                ->first();

            if (!$job) {
                $this->warn("No more jobs to process.");
                break;
            }

            $this->line("Processing job ID: {$job->id} ({$job->queue})...");

            try {
                // Process this specific job by ID
                $exitCode = Artisan::call('queue:work', [
                    '--once' => true,
                    '--queue' => $job->queue,
                    '--no-interaction' => true,
                ]);

                $output = Artisan::output();

                if (!empty($output) && $this->getOutput()->isVerbose()) {
                    $this->line("  Output: " . trim($output));
                }

                if ($exitCode === 0) {
                    $jobsProcessed++;
                    $this->info("  ✓ Job #{$job->id} processed successfully");
                } else {
                    $jobsFailed++;
                    $this->error("  ✗ Job #{$job->id} failed (exit code: {$exitCode})");
                }

                // Small delay between jobs
                usleep(100000); // 0.1 seconds

            } catch (\Exception $e) {
                $jobsFailed++;
                $this->error("  ✗ Exception: " . $e->getMessage());

                // Move to failed jobs
                DB::table('failed_jobs')->insert([
                    'uuid' => (string) \Illuminate\Support\Str::uuid(),
                    'connection' => $job->connection ?? 'database',
                    'queue' => $job->queue,
                    'payload' => $job->payload,
                    'exception' => (string) $e,
                    'failed_at' => now(),
                ]);

                // Delete from jobs table
                DB::table('jobs')->where('id', $job->id)->delete();
            }

            // Refresh remaining count
            $totalJobs = DB::table('jobs')
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

        Log::info('Queue processed randomly', [
            'processed' => $jobsProcessed,
            'failed' => $jobsFailed,
            'duration' => $duration,
            'remaining' => $totalJobs,
        ]);

        return Command::SUCCESS;
    }
}
