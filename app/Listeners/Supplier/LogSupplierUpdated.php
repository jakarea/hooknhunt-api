<?php

namespace App\Listeners\Supplier;

use App\Events\Supplier\SupplierUpdated;
use Illuminate\Support\Facades\Log;

/**
 * Log when a supplier is updated.
 *
 * This listener runs asynchronously to avoid slowing down
 * the supplier update process.
 */
class LogSupplierUpdated
{
    /**
     * Handle the event.
     */
    public function handle(SupplierUpdated $event): void
    {
        Log::info('Supplier updated', [
            'supplier_id' => $event->supplier->id,
            'name' => $event->supplier->name,
            'changes' => $event->changes,
            'updated_by' => auth()->id()?->id ?? 'system',
            'updated_at' => now()->toDateTimeString(),
        ]);
    }
}
