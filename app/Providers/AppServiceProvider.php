<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

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
    }
}
