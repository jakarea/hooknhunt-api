<?php

namespace App\Modules\Procurement\Listeners\Supplier;

use App\Modules\Procurement\Events\Supplier\SupplierCreated;
use Illuminate\Support\Facades\Notification;

/**
 * Send notification when a new supplier is created.
 *
 * This listener runs asynchronously to send notifications
 * without blocking the supplier creation process.
 */
class SendSupplierCreatedNotification
{
    /**
     * Handle the event.
     */
    public function handle(SupplierCreated $event): void
    {
        // TODO: Implement notification logic
        // Example: Notify procurement team about new supplier

        // $users = \App\Modules\System\Models\User::role('procurement-manager')->get();
        // Notification::send($users, new SupplierCreatedNotification($event->supplier));

        // For now, just log it
        \Log::info('\App\Modules\Procurement\Models\Supplier created notification would be sent', [
            'supplier_id' => $event->supplier->id,
            'supplier_name' => $event->supplier->name,
        ]);
    }
}
