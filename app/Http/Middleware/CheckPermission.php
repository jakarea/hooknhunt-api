<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckPermission
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $permissionSlug): Response
    {
        $user = $request->user();

        // ১. ইউজার লগইন নেই বা টোকেন ইনভ্যালিড
        if (!$user) {
            return response()->json([
                'status' => false,
                'message' => 'Unauthorized Access.',
            ], 401);
        }

        // ২. সুপার অ্যাডমিন হলে সব কিছু বাইপাস (God Mode)
        // আমরা এখানে 'slug' চেক করছি কারণ এটি হার্ডকোডেড আইডির চেয়ে সেফ
        if ($user->role && $user->role->slug === 'super_admin') {
            return $next($request);
        }

        /**
         * ৩. পারমিশন চেক (Hybrid Logic)
         * আমরা ইউজারের মডেলে 'hasPermissionTo' মেথডটি কল করছি যা রোল এবং ডাইরেক্ট এক্সেস দুইটাই চেক করবে।
         */
        if (!$user->hasPermissionTo($permissionSlug)) {
            return response()->json([
                'status' => false,
                'message' => 'এই কাজটি করার অনুমতি আপনার নেই (Permission Denied).',
                'required_permission' => $permissionSlug,
                'errors' => 'আপনার রোল অথবা ব্যক্তিগত এক্সেসে এই পারমিশনটি খুঁজে পাওয়া যায়নি।'
            ], 403);
        }

        return $next($request);
    }
}