<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\MethodNotAllowedHttpException;
use App\Http\Middleware\XssSanitization;
use App\Http\Middleware\CamelCaseResponse;
use Illuminate\Console\Scheduling\Schedule;


return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            require base_path('routes/website.php');
        },
    )
    ->withSchedule(function (Schedule $schedule) {
        // Generate daily financial report at 6:00 AM every day
        $schedule->command('finance:daily-report')
                 ->dailyAt('06:00')
                 ->description('Generate daily financial report')
                 ->withoutOverlapping();
    })
    ->withMiddleware(function (Middleware $middleware) {
            // Disable EnsureFrontendRequestsAreStateful for local development with Bearer tokens
            // Re-enable for production when using cookie-based auth
            // $middleware->api(prepend: [
            //     \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
            // ]);

            $middleware->append(XssSanitization::class);
            $middleware->append(\App\Http\Middleware\AuditLogMiddleware::class);

            // Apply CamelCaseResponse middleware to API routes only
            $middleware->api(CamelCaseResponse::class);

            // Configure authentication redirect - API routes should NOT redirect
            // CRITICAL: This prevents "Route [login] not defined" errors
            // Our API uses Bearer tokens (Sanctum), not session-based redirects
            $middleware->redirectGuestsTo(function (Request $request) {
                // For API routes, don't redirect - just let the exception handler return JSON
                if ($request->is('api/*')) {
                    return null; // This prevents redirect and triggers exception instead
                }
                // For web routes, you could redirect to a login page
                return '/login';
            });

            $middleware->alias([
                // 'auth' => \App\Http\Middleware\Authenticate::class, // Use default Laravel auth
                'permission' => \App\Http\Middleware\CheckPermission::class, // এটি যুক্ত করুন
                'role' => \App\Http\Middleware\CheckRoleMiddleware::class,   // এটিও যুক্ত করে রাখা ভালো
            ]);
        })
        ->withExceptions(function (Exceptions $exceptions) {
        
        /**
         * ১. Unauthenticated (401) - টোকেন ভুল বা না থাকলে।
         * এটি আপনার সেই "Route [login] not defined" গর্তটি বন্ধ করবে।
         */
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'status' => false,
                    'message' => 'Unauthenticated',
                    'errors' => 'আপনার টোকেনটি ভুল অথবা মেয়াদ শেষ হয়ে গেছে। দয়া করে আবার লগইন করুন।',
                    'data' => null
                ], 401);
            }
        });

        /**
         * ২. Validation Failed (422) - ভ্যালিডেশন এরর।
         */
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'status' => false,
                    'message' => 'ভ্যালিডেশন এরর',
                    'errors' => $e->errors(),
                    'data' => null
                ], 422);
            }
        });

        /**
         * ৩. Resource Not Found (404) - ভুল URL বা ডাটা না থাকলে।
         */
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'status' => false,
                    'message' => 'লিংকটি খুঁজে পাওয়া যায়নি',
                    'errors' => 'আপনি যে এপিআই এন্ডপয়েন্টটি খুঁজছেন তা আমাদের সিস্টেমে নেই।',
                    'data' => null
                ], 404);
            }
        });

        /**
         * ৪. Access Denied (403) - পারমিশন না থাকলে।
         */
        $exceptions->render(function (AccessDeniedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'status' => false,
                    'message' => 'অ্যাক্সেস ডিনাইড',
                    'errors' => 'এই কাজটি করার অনুমতি আপনার নেই।',
                    'data' => null
                ], 403);
            }
        });

        /**
         * ৫. Method Not Allowed (405) - ভুল মেথডে রিকোয়েস্ট দিলে (যেমন GET এর জায়গায় POST)।
         */
        $exceptions->render(function (MethodNotAllowedHttpException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'status' => false,
                    'message' => 'ভুল মেথড',
                    'errors' => 'এই এপিআই-তে রিকোয়েস্ট করার মেথডটি সঠিক নয়।',
                    'data' => null
                ], 405);
            }
        });

        /**
         * ৬. General Server Error (500) - ক্র্যাশ বা ইন্টারনাল বাগ।
         * হ্যাকার যাতে কোড বা পাথের হদিস না পায়, তাই আমরা ডিটেইলস লুকিয়ে ফেলব।
         */
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                // অ্যাপ যদি প্রোডাকশনে থাকে তবে ডিটেইল এরর লুকান
                $message = config('app.debug') ? $e->getMessage() : 'সার্ভার ইন্টারনাল এরর। দয়া করে এডমিনের সাথে যোগাযোগ করুন।';
                
                return response()->json([
                    'status' => false,
                    'message' => 'সার্ভার এরর',
                    'errors' => $message,
                    'data' => null
                ], 500);
            }
        });

    })->create();

     // 'errors' => $e->getMessage(), // Hide in production