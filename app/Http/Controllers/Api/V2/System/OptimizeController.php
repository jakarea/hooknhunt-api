<?php

namespace App\Http\Controllers\Api\V2\System;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

class OptimizeController
{
    /**
     * Run all Laravel optimization commands.
     * Accessible by any authenticated admin user (admin or super_admin).
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        // Verify user is authenticated
        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized access.',
            ], 401);
        }

        // Verify user is an admin (admin or super_admin)
        $userRole = $user->role;
        if (!$userRole || !in_array($userRole->slug, ['admin', 'super_admin'])) {
            return response()->json([
                'status' => false,
                'message' => 'Access denied. Admin privileges required.',
            ], 403);
        }

        $results = [];
        $startTime = microtime(true);

        try {
            // 1. Clear all caches first
            $results['steps'][] = $this->runCommand('cache:clear', 'Clearing application cache...');
            $results['steps'][] = $this->runCommand('view:clear', 'Clearing compiled views...');
            $results['steps'][] = $this->runCommand('config:clear', 'Clearing configuration cache...');
            $results['steps'][] = $this->runCommand('route:clear', 'Clearing route cache...');

            // 2. Rebuild optimizations
            $results['steps'][] = $this->runCommand('config:cache', 'Caching configuration...');
            $results['steps'][] = $this->runCommand('route:cache', 'Caching routes...');
            $results['steps'][] = $this->runCommand('view:cache', 'Caching views...');
            $results['steps'][] = $this->runCommand('event:cache', 'Caching events...');

            // 3. Additional optimizations
            $results['steps'][] = $this->runCommand('optimize', 'Optimizing application for production...');

            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000);

            // Count total steps
            $totalSteps = count($results['steps']);
            $successSteps = collect($results['steps'])->where('status', 'success')->count();
            $failedSteps = $totalSteps - $successSteps;

            return response()->json([
                'status' => true,
                'message' => 'Application optimized successfully',
                'data' => [
                    'duration_ms' => $duration,
                    'total_steps' => $totalSteps,
                    'success_count' => $successSteps,
                    'failed_count' => $failedSteps,
                    'steps' => $results['steps'],
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Optimization failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000);

            return response()->json([
                'status' => false,
                'message' => 'Optimization failed: ' . $e->getMessage(),
                'data' => [
                    'duration_ms' => $duration,
                    'steps' => $results['steps'] ?? [],
                    'error' => $e->getMessage(),
                ],
            ], 500);
        }
    }

    /**
     * Run an Artisan command and return result.
     *
     * @param string $command
     * @param string $description
     * @return array
     */
    protected function runCommand(string $command, string $description): array
    {
        $startTime = microtime(true);

        try {
            $exitCode = Artisan::call($command, [
                '--quiet' => true,
            ]);

            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000);

            if ($exitCode === 0) {
                return [
                    'command' => $command,
                    'description' => $description,
                    'status' => 'success',
                    'duration_ms' => $duration,
                ];
            }

            return [
                'command' => $command,
                'description' => $description,
                'status' => 'failed',
                'duration_ms' => $duration,
                'exit_code' => $exitCode,
            ];
        } catch (\Exception $e) {
            $endTime = microtime(true);
            $duration = round(($endTime - $startTime) * 1000);

            return [
                'command' => $command,
                'description' => $description,
                'status' => 'error',
                'duration_ms' => $duration,
                'error' => $e->getMessage(),
            ];
        }
    }
}
