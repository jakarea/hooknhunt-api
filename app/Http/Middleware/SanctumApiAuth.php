<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Sanctum API Authentication Middleware
 *
 * This middleware authenticates API requests using Sanctum Bearer tokens.
 * Returns JSON errors instead of redirects for API requests.
 */
class SanctumApiAuth
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Get token from Authorization header
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthenticated',
                'errors' => 'Authorization token required. Please provide a valid Bearer token.',
                'data' => null
            ], 401);
        }

        try {
            // Find the token in database
            $accessToken = PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthenticated',
                    'errors' => 'Invalid token. Please login again.',
                    'data' => null
                ], 401);
            }

            // Check if token has expired
            if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthenticated',
                    'errors' => 'Token expired. Please login again.',
                    'data' => null
                ], 401);
            }

            // Get the tokenable user
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthenticated',
                    'errors' => 'User not found.',
                    'data' => null
                ], 401);
            }

            // Set the authenticated user for this request
            auth()->guard('web')->setUser($user);

            return $next($request);

        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'Authentication error',
                'errors' => 'An error occurred during authentication.',
                'data' => null
            ], 500);
        }
    }
}
