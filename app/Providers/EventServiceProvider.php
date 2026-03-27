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
