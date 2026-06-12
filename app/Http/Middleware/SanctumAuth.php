<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Sanctum Auth Middleware for Web Routes
 *
 * This middleware allows web routes to authenticate using Sanctum tokens
 * from localStorage, similar to how API routes work.
 *
 * Usage: Route::middleware(['sanctum.auth'])->group(function () { ... });
 */
class SanctumAuth
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
        // Try multiple sources for the token
        $token = null;

        // 1. Check Authorization header (for AJAX requests)
        $token = $request->bearerToken();

        // 2. Check cookie (for page loads from frontend)
        if (!$token) {
            $token = $request->cookie('auth_token');
        }

        // 3. Check request parameter (for testing/debugging)
        if (!$token && $request->has('token')) {
            $token = $request->input('token');
        }

        if (!$token) {
            // No token found, redirect to login with return URL
            return redirect()->guest('/login?redirect=' . urlencode($request->fullUrl()));
        }

        try {
            // Find the token in database
            $accessToken = PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                // Invalid token, redirect to login
                return redirect()->guest('/login?redirect=' . urlencode($request->fullUrl()));
            }

            // Check if token has expired
            if ($accessToken->expires_at && $accessToken->expires_at->isPast()) {
                // Token expired, redirect to login
                return redirect()->guest('/login?redirect=' . urlencode($request->fullUrl()));
            }

            // Get the tokenable user (customer)
            $user = $accessToken->tokenable;

            if (!$user) {
                // User not found, redirect to login
                return redirect()->guest('/login?redirect=' . urlencode($request->fullUrl()));
            }

            // Authenticate the user for this request
            auth()->guard('web')->setUser($user);

            // Share the authenticated user to all views
            view()->share('authenticatedUser', $user);

            return $next($request);

        } catch (\Exception $e) {
            // Any error during authentication, redirect to login
            return redirect()->guest('/login?redirect=' . urlencode($request->fullUrl()));
        }
    }
}
