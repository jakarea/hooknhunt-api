<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Load EPS payment config manually if not already loaded
        if (empty(config('eps'))) {
            $epsConfig = require base_path('config/epsPayment.php');
            config(['eps' => $epsConfig]);
        }

        // Macro for frontend URLs (website product pages, etc.)
        URL::macro('frontend', function (string $path = ''): string {
            $frontendUrl = rtrim(config('app.frontend_url') ?? env('FRONTEND_URL', 'https://www.hooknhunt.com'), '/');
            $path = ltrim($path, '/');
            return $frontendUrl . '/' . $path;
        });
    }
}
