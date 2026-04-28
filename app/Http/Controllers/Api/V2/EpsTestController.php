<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Services\PaymentGateways\EPSService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;

/**
 * EPS Test Controller
 *
 * Test endpoint for checking EPS payment gateway connectivity and authentication.
 * This helps debug EPS connection issues without processing actual payments.
 *
 * @package App\Http\Controllers\Api\V2
 */
class EpsTestController extends Controller
{
    private EPSService $epsService;

    public function __construct(EPSService $epsService)
    {
        $this->epsService = $epsService;
    }

    /**
     * Test EPS connectivity and authentication.
     * GET /api/v2/test/eps/connectivity
     *
     * @return JsonResponse
     */
    public function connectivity(): JsonResponse
    {
        // Clear any existing cached token to force a fresh auth attempt
        $modes = ['sandbox', 'live'];
        $results = [];

        foreach ($modes as $mode) {
            $cacheKey = 'eps_bearer_token_' . $mode;
            Cache::forget($cacheKey);

            // Temporarily change mode for testing
            $originalMode = config('eps.mode');
            config(['eps.mode' => $mode]);

            $results[$mode] = $this->testAuth($mode);

            // Restore original mode
            config(['eps.mode' => $originalMode]);
        }

        return response()->json([
            'success' => true,
            'message' => 'EPS Connectivity Test Results',
            'timestamp' => now()->toIso8601String(),
            'results' => $results,
        ]);
    }

    /**
     * Test authentication for a specific mode.
     *
     * @param string $mode
     * @return array
     */
    private function testAuth(string $mode): array
    {
        $creds = $this->getCredentialsForMode($mode);

        if (!$creds['store_id'] || !$creds['username'] || !$creds['password']) {
            return [
                'status' => 'skipped',
                'message' => 'No credentials configured for ' . $mode . ' mode',
                'missing_credentials' => array_filter([
                    'store_id' => empty($creds['store_id']),
                    'username' => empty($creds['username']),
                    'password' => empty($creds['password']),
                ]),
            ];
        }

        try {
            // Use reflection to call protected method
            $reflection = new \ReflectionClass($this->epsService);
            $method = $reflection->getMethod('getBearerToken');
            $method->setAccessible(true);

            $start = microtime(true);
            $result = $method->invoke($this->epsService);
            $duration = round((microtime(true) - $start) * 1000, 2);

            // Check result
            if (is_string($result)) {
                return [
                    'status' => 'success',
                    'message' => 'Successfully obtained bearer token',
                    'token_preview' => substr($result, 0, 20) . '...',
                    'token_length' => strlen($result),
                    'response_time_ms' => $duration,
                    'credentials_used' => [
                        'store_id' => $creds['store_id'],
                        'username' => $creds['username'],
                        'base_url' => $creds['base_url'],
                    ],
                ];
            }

            if (is_array($result) && isset($result['success']) && !$result['success']) {
                return [
                    'status' => 'failed',
                    'message' => $result['error'] ?? 'Authentication failed',
                    'http_status' => $result['http_status'] ?? null,
                    'eps_response' => $result['eps_response'] ?? null,
                    'eps_json' => $result['eps_json'] ?? null,
                    'response_time_ms' => $duration,
                    'credentials_used' => [
                        'store_id' => $creds['store_id'],
                        'username' => $creds['username'],
                        'base_url' => $creds['base_url'],
                    ],
                ];
            }

            return [
                'status' => 'unknown',
                'message' => 'Unexpected result from getBearerToken',
                'result_type' => gettype($result),
                'result' => $result,
            ];

        } catch (\Exception $e) {
            return [
                'status' => 'exception',
                'message' => 'Exception during authentication test',
                'exception' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ];
        }
    }

    /**
     * Get credentials for a specific mode.
     *
     * @param string $mode
     * @return array
     */
    private function getCredentialsForMode(string $mode): array
    {
        return [
            'store_id' => config("eps.{$mode}.store_id"),
            'username' => config("eps.{$mode}.username"),
            'password' => config("eps.{$mode}.password"),
            'base_url' => config("eps.{$mode}.base_url"),
        ];
    }

    /**
     * Get current EPS configuration (without passwords).
     * GET /api/v2/test/eps/config
     *
     * @return JsonResponse
     */
    public function config(): JsonResponse
    {
        $config = config('eps');

        // Remove sensitive data
        $config['sandbox']['password'] = '[HIDDEN]';
        $config['live']['password'] = '[HIDDEN]';

        return response()->json([
            'success' => true,
            'config' => $config,
            'cache_enabled' => Cache::getStore() instanceof \Illuminate\Cache\DatabaseStore ? 'database' : get_class(Cache::getStore()),
        ]);
    }
}
