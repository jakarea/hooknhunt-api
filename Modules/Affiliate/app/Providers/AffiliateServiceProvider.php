<?php

namespace App\Modules\Affiliate\Providers;

use Nwidart\Modules\Support\ModuleServiceProvider;
use Illuminate\Console\Scheduling\Schedule;
use App\Modules\Website\Models\WebsiteOrder;
use App\Modules\Affiliate\Observers\SalesOrderObserver;

class AffiliateServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Affiliate';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'affiliate';

    /**
     * Command classes to register.
     *
     * @var string[]
     */
    // protected array $commands = [];

    /**
     * Provider classes to register.
     *
     * @var string[]
     */
    protected array $providers = [
        EventServiceProvider::class,
        RouteServiceProvider::class,
    ];

    /**
     * Boot the service provider.
     */
    public function boot(): void
    {
        parent::boot();

        // Register WebsiteOrder observer for affiliate commission tracking
        if (class_exists(WebsiteOrder::class)) {
            WebsiteOrder::observe(SalesOrderObserver::class);
        }
    }

    /**
     * Define module schedules.
     *
     * @param $schedule
     */
    // protected function configureSchedules(Schedule $schedule): void
    // {
    //     $schedule->command('inspire')->hourly();
    // }
}
