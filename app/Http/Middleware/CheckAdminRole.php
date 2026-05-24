<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CheckAdminRole
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Illuminate\Http\Response|\Illuminate\Http\RedirectResponse)  $next
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function handle(Request $request, Closure $next)
    {
        // Check if user is authenticated
        if (!Auth::check()) {
            return response()->json([
                'success' => false,
                'message' => 'Authentication required',
                'error' => 'You must be logged in to access this resource'
            ], 401);
        }

        // Check if user has admin role
        $user = Auth::user();

        // Check for role using multiple possible methods
        $isAdmin = false;

        if (method_exists($user, 'hasRole')) {
            // Using Spatie or similar permission package
            $isAdmin = $user->hasRole('admin') || $user->hasRole('super_admin');
        } elseif (isset($user->role)) {
            // Using direct role property
            $isAdmin = in_array($user->role, ['admin', 'super_admin']);
        } elseif (isset($user->role_id)) {
            // Using role_id with database query
            $role = \App\Modules\System\Models\Role::find($user->role_id);
            $isAdmin = $role && in_array($role->slug, ['admin', 'super_admin']);
        }

        if (!$isAdmin) {
            return response()->json([
                'success' => false,
                'message' => 'Access denied',
                'error' => 'You do not have permission to access this resource'
            ], 403);
        }

        return $next($request);
    }
}
