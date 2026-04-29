<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Lazychat Authentication Middleware
 *
 * Validates Bearer token for Lazychat AI requests.
 * Only allows requests from authenticated Lazychat instances.
 *
 * @package App\Http\Middleware
 */
class LazychatAuth
{
    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Get the bearer token from Authorization header
        $token = $request->bearerToken();

        if (empty($token)) {
            Log::warning('Lazychat request missing authentication token', [
                'ip' => $request->ip(),
                'url' => $request->fullUrl(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Authentication required',
                'message' => 'Bearer token is missing',
            ], 401);
        }

        // Get expected token from environment
        $expectedToken = env('LAZYCHAT_API_TOKEN');

        if (empty($expectedToken)) {
            Log::error('LAZYCHAT_API_TOKEN not configured in .env file');

            return response()->json([
                'success' => false,
                'error' => 'Configuration error',
                'message' => 'Lazychat integration not configured',
            ], 500);
        }

        // Validate token
        if ($token !== $expectedToken) {
            Log::warning('Lazychat authentication failed - invalid token', [
                'ip' => $request->ip(),
                'url' => $request->fullUrl(),
            ]);

            // Implement rate limiting for failed attempts
            $this->incrementFailedAttempts($request->ip());

            return response()->json([
                'success' => false,
                'error' => 'Authentication failed',
                'message' => 'Invalid bearer token',
            ], 403);
        }

        // Token is valid - reset failed attempts counter
        $this->resetFailedAttempts($request->ip());

        // Add Lazychat source to request for later use
        $request->attributes->set('lazychat_authenticated', true);

        return $next($request);
    }

    /**
     * Increment failed authentication attempts.
     * Used for rate limiting and security monitoring.
     *
     * @param string $ip
     * @return void
     */
    private function incrementFailedAttempts(string $ip): void
    {
        $key = "lazychat:failed_attempts:{$ip}";
        $attempts = Cache::get($key, 0) + 1;
        Cache::put($key, $attempts, now()->addHours(1));

        // Log if too many failed attempts
        if ($attempts >= 5) {
            Log::alert('Lazychat authentication - multiple failed attempts', [
                'ip' => $ip,
                'attempts' => $attempts,
            ]);
        }
    }

    /**
     * Reset failed authentication attempts after successful auth.
     *
     * @param string $ip
     * @return void
     */
    private function resetFailedAttempts(string $ip): void
    {
        $key = "lazychat:failed_attempts:{$ip}";
        Cache::forget($key);
    }
}
