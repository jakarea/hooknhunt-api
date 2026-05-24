<?php

namespace App\Http\Middleware;

// Alias for Laravel's default Authenticate middleware
class Authenticate extends \Illuminate\Auth\Middleware\Authenticate
{
    // This class extends Laravel's default Authenticate middleware
    // All functionality is inherited

    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo($request)
    {
        if (!$request->expectsJson()) {
            return route('login');
        }
    }
}
