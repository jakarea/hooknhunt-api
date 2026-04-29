<?php

namespace App\Providers;

use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Listeners\SendEmailVerificationNotification;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Event;

use App\Events\Supplier\SupplierCreated;
use App\Events\Supplier\SupplierUpdated;
use App\Events\Supplier\SupplierDeleted;
use App\Listeners\Supplier\LogSupplierCreated;
use App\Listeners\Supplier\LogSupplierUpdated;
use App\Listeners\Supplier\LogSupplierDeleted;
use App\Listeners\Supplier\SendSupplierCreatedNotification;

// Lazychat Integration Events
use App\Events\Product\ProductCreated;
use App\Events\Product\ProductUpdated;
use App\Events\Product\ProductDeleted;
use App\Events\Product\VariantStockChanged;
use App\Listeners\Product\SyncProductToLazychat;
use App\Listeners\Product\SyncVariantStockChangeToLazychat;

// Lazychat Integration - Order Events
use App\Events\Order\OrderCreated;
use App\Events\Order\OrderPaid;
use App\Events\Order\OrderFailed;
use App\Events\Order\OrderCancelled;
use App\Events\Order\OrderShipped;
use App\Listeners\Order\SendOrderToLazychat;
use App\Listeners\Order\SendOrderShippedToLazychat;

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

        // Lazychat Integration - Product Sync Events
        ProductCreated::class => [
            SyncProductToLazychat::class . '@handleProductCreated',
        ],

        ProductUpdated::class => [
            SyncProductToLazychat::class . '@handleProductUpdated',
        ],

        ProductDeleted::class => [
            SyncProductToLazychat::class . '@handleProductDeleted',
        ],

        // Lazychat Integration - Variant Stock Events
        VariantStockChanged::class => [
            SyncVariantStockChangeToLazychat::class,
        ],

        // Lazychat Integration - Order Events
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
