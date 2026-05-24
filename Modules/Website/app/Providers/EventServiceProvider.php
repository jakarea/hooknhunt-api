<?php

namespace App\Modules\Website\Providers;

use App\Modules\Catalog\Events\CategoryCreated;
use App\Modules\Catalog\Events\CategoryDeleted;
use App\Modules\Catalog\Events\CategoryUpdated;
use App\Modules\Catalog\Events\ProductCreated;
use App\Modules\Catalog\Events\ProductDeleted;
use App\Modules\Catalog\Events\ProductUpdated;
use App\Modules\Website\Listeners\DeleteCatalogCategoryFromWebsite;
use App\Modules\Website\Listeners\DeleteCatalogProductFromWebsite;
use App\Modules\Website\Listeners\SyncCatalogCategoryToWebsite;
use App\Modules\Website\Listeners\SyncCatalogProductToWebsite;
use App\Modules\Website\Listeners\UpdateCatalogCategoryInWebsite;
use App\Modules\Website\Listeners\UpdateCatalogProductInWebsite;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event handler mappings for the application.
     *
     * @var array<string, array<int, string>>
     */
    protected $listen = [
        // Catalog product events → Website sync listeners
        ProductCreated::class => [
            SyncCatalogProductToWebsite::class,
        ],

        ProductUpdated::class => [
            UpdateCatalogProductInWebsite::class,
        ],

        ProductDeleted::class => [
            DeleteCatalogProductFromWebsite::class,
        ],

        // Catalog category events → Website sync listeners
        CategoryCreated::class => [
            SyncCatalogCategoryToWebsite::class,
        ],

        CategoryUpdated::class => [
            UpdateCatalogCategoryInWebsite::class,
        ],

        CategoryDeleted::class => [
            DeleteCatalogCategoryFromWebsite::class,
        ],
    ];

    /**
     * Indicates if events should be discovered.
     *
     * @var bool
     */
    protected static $shouldDiscoverEvents = true;

    /**
     * Configure the proper event listeners for email verification.
     */
    protected function configureEmailVerification(): void {}
}
