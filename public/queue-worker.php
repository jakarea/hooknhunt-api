<?php
/**
 * Simple Queue Worker for cPanel
 *
 * Usage: php public/queue-worker.php
 * Or via cron: php /path/to/public/queue-worker.php
 *
 * Process jobs from the queue without Supervisor.
 */

// Change to project root
chdir(__DIR__ . '/..');

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';

use Illuminate\Support\Facades\Artisan;

echo "==========================================\n";
echo " Queue Worker for cPanel\n";
echo "==========================================\n\n";

$startTime = microtime(true);
$jobsProcessed = 0;
$jobsFailed = 0;
$maxJobs = 10; // Process max 10 jobs per run
$maxTime = 55; // Max 55 seconds (leave 5s buffer for cPanel's 60s limit)

echo "Starting queue worker...\n";
echo "Max jobs: $maxJobs\n";
echo "Max time: $maxTime seconds\n\n";

while ($jobsProcessed < $maxJobs) {
    // Check time limit
    $elapsed = microtime(true) - $startTime;
    if ($elapsed > $maxTime) {
        echo "\n⏰ Time limit reached ($maxTime seconds)\n";
        break;
    }

    try {
        // Process ONE job
        $exitCode = Artisan::call('queue:work', [
            '--once' => true,
            '--no-interaction' => true,
        ]);

        $output = Artisan::output();

        if (!empty($output)) {
            echo "[$jobsProcessed] $output";
        }

        if ($exitCode === 0) {
            $jobsProcessed++;
            echo "✓ Job #$jobsProcessed processed successfully\n";
        } else {
            $jobsFailed++;
            echo "✗ Job failed (exit code: $exitCode)\n";
        }

        // Small delay between jobs
        usleep(100000); // 0.1 seconds

    } catch (\Exception $e) {
        echo "✗ Error: " . $e->getMessage() . "\n";
        $jobsFailed++;
    }
}

$duration = round(microtime(true) - $startTime, 2);

echo "\n==========================================\n";
echo " Summary:\n";
echo "==========================================\n";
echo "✓ Processed: $jobsProcessed jobs\n";
echo "✗ Failed: $jobsFailed jobs\n";
echo "⏱ Duration: {$duration}s\n";
echo "==========================================\n";

exit(0);
