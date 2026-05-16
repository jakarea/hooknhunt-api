<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Artisan;

/**
 * Job Queue Controller (cPanel Friendly)
 *
 * Public endpoint to process queue jobs one by one.
 * No Supervisor or queue worker needed - just visit this URL.
 *
 * @package App\Http\Controllers\Api\V2
 */
class JobQueueController extends Controller
{
    /**
     * Process ONE job from the queue.
     *
     * Call this URL to process jobs one by one:
     * GET /api/v2/queue/process?token=YOUR_SECRET_TOKEN
     *
     * Each visit processes ONE job from the jobs table.
     * Can be called manually or via cPanel cron.
     *
     * @param \Illuminate\Http\Request $request
     * @return JsonResponse
     */
    public function process(\Illuminate\Http\Request $request): JsonResponse
    {
        // Security: Check for secret token
        $token = config('app.queue_process_token', '6f9f4cd1ee85e7720c8eb6b7f389e51f5d5f1902af2dd72b48520ead53600682');
        if ($request->input('token') !== $token) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
                'message' => 'Invalid token',
            ], 403);
        }

        // Get total jobs count
        $totalJobs = DB::table('jobs')->count();

        if ($totalJobs === 0) {
            return response()->json([
                'success' => true,
                'message' => 'No jobs in queue',
                'jobs_remaining' => 0,
                'jobs_processed' => 0,
            ]);
        }

        try {
            // Use Laravel's queue work command to process ONE job
            $exitCode = Artisan::call('queue:work', [
                '--once' => true,
                '--queue' => 'lazychat-webhooks,default',
                '--no-interaction' => true,
            ]);

            $output = Artisan::output();

            // Get remaining jobs
            $jobsRemaining = DB::table('jobs')->count();

            // Check if job was processed successfully
            if ($exitCode === 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Job processed successfully',
                    'jobs_remaining' => $jobsRemaining,
                    'exit_code' => $exitCode,
                    'output' => $output,
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Job processing failed',
                    'message' => 'Queue worker returned non-zero exit code',
                    'jobs_remaining' => $jobsRemaining,
                    'exit_code' => $exitCode,
                    'output' => $output,
                ]);
            }

        } catch (\Exception $e) {
            Log::error('Queue job processing failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Processing failed',
                'message' => $e->getMessage(),
                'jobs_remaining' => DB::table('jobs')->count(),
            ], 500);
        }
    }

    /**
     * Get queue status (for dashboard/monitoring).
     *
     * GET /api/v2/queue/status?token=YOUR_SECRET_TOKEN
     *
     * @param \Illuminate\Http\Request $request
     * @return JsonResponse
     */
    public function status(\Illuminate\Http\Request $request): JsonResponse
    {
        $token = config('app.queue_process_token', '6f9f4cd1ee85e7720c8eb6b7f389e51f5d5f1902af2dd72b48520ead53600682');
        if ($request->input('token') !== $token) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthorized',
            ], 403);
        }

        $pendingJobs = DB::table('jobs')->count();
        $failedJobs = DB::table('failed_jobs')->count();
        $lazychatLogs = \App\Models\LazychatWebhookLog::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status = "success" THEN 1 ELSE 0 END) as success,
            SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed,
            SUM(CASE WHEN status = "pending" THEN 1 ELSE 0 END) as pending
        ')->first();

        return response()->json([
            'success' => true,
            'data' => [
                'queue' => [
                    'pending_jobs' => $pendingJobs,
                    'failed_jobs' => $failedJobs,
                ],
                'lazychat_webhooks' => [
                    'total' => $lazychatLogs->total ?? 0,
                    'success' => $lazychatLogs->success ?? 0,
                    'failed' => $lazychatLogs->failed ?? 0,
                    'pending' => $lazychatLogs->pending ?? 0,
                ],
            ],
        ]);
    }
}
