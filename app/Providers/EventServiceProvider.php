<?php

namespace App\Providers;

use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

// Procurement Module - Supplier Events & Listeners
use App\Modules\Procurement\Events\Supplier\SupplierCreated;
use App\Modules\Procurement\Events\Supplier\SupplierUpdated;
use App\Modules\Procurement\Events\Supplier\SupplierDeleted;
use App\Modules\Procurement\Listeners\Supplier\LogSupplierCreated;
use App\Modules\Procurement\Listeners\Supplier\LogSupplierUpdated;
use App\Modules\Procurement\Listeners\Supplier\LogSupplierDeleted;
use App\Modules\Procurement\Listeners\Supplier\SendSupplierCreatedNotification;

// Catalog Module - Product Events & Listeners
use App\Modules\Catalog\Events\Product\ProductCreated;
use App\Modules\Catalog\Events\Product\ProductUpdated;
use App\Modules\Catalog\Events\Product\ProductDeleted;
use App\Modules\Catalog\Events\Product\VariantStockChanged;
use App\Modules\Catalog\Listeners\Product\SyncProductToLazychat;
use App\Modules\Catalog\Listeners\Product\SyncVariantStockChangeToLazychat;

// Website Module - Order Events & Listeners
use App\Modules\Website\Events\Order\OrderCreated;
use App\Modules\Website\Events\Order\OrderPaid;
use App\Modules\Website\Events\Order\OrderFailed;
use App\Modules\Website\Events\Order\OrderCancelled;
use App\Modules\Website\Events\Order\OrderShipped;
use App\Modules\Website\Listeners\Order\SendOrderToLazychat;
use App\Modules\Website\Listeners\Order\SendOrderShippedToLazychat;

/**
 * Event Service Provider
 *
 * Registers event listeners and event subscribers for the application.
 */
class EventServiceProvider extends ServiceProvider
{
    /**
     * The event to listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Registered::class => [
            SendEmailVerificationNotification::class,
        ],

        // Supplier Events
        SupplierCreated::class => [
            LogSupplierCreated::class,
            SendSupplierCreatedNotification::class,
        ],

        SupplierUpdated::class => [
            LogSupplierUpdated::class,
        ],

        SupplierDeleted::class => [
            LogSupplierDeleted::class,
        ],

        // Product Sync Events
        ProductCreated::class => [
            SyncProductToLazychat::class . '@handleProductCreated',
        ],

        ProductUpdated::class => [
            SyncProductToLazychat::class . '@handleProductUpdated',
        ],

        ProductDeleted::class => [
            SyncProductToLazychat::class . '@handleProductDeleted',
        ],

        // Variant Stock Events
        VariantStockChanged::class => [
            SyncVariantStockChangeToLazychat::class,
        ],

        // Order Events
        OrderCreated::class => [
            SendOrderToLazychat::class . '@handleOrderCreated',
        ],

        OrderPaid::class => [
            SendOrderToLazychat::class . '@handleOrderPaid',
        ],

        OrderFailed::class => [
            SendOrderToLazychat::class . '@handleOrderFailed',
        ],

        OrderCancelled::class => [
            SendOrderToLazychat::class . '@handleOrderCancelled',
        ],

        OrderShipped::class => [
            SendOrderShippedToLazychat::class,
        ],
    ];

    /**
     * Register any events for your application.
     */
    public function boot(): void
    {
        //
    }

    /**
     * Determine if events and listeners should be automatically discovered.
     */
    public function shouldDiscoverEvents(): bool
    {
        return false;
    }
}
