<?php

namespace App\Providers;

use App\Modules\Procurement\Repositories\Contracts\SupplierRepositoryInterface;
use App\Modules\Procurement\Repositories\SupplierRepository;
use Illuminate\Support\ServiceProvider;

/**
 * Repository Service Provider
 *
 * Binds repository interfaces to their implementations for dependency injection.
 */
class RepositoryServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Bind SupplierRepository interface to implementation
        $this->app->bind(SupplierRepositoryInterface::class, SupplierRepository::class);
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        //
    }
}
