<?php

namespace App\Listeners\Supplier;

use App\Events\Supplier\SupplierDeleted;
use Illuminate\Support\Facades\Log;

/**
 * Log when a supplier is deleted.
 *
 * This listener runs asynchronously to avoid slowing down
 * the supplier deletion process.
 */
class LogSupplierDeleted
{
    /**
     * Handle the event.
     */
    public function handle(SupplierDeleted $event): void
    {
        Log::warning('Supplier deleted', [
            'supplier_id' => $event->supplierId,
            'name' => $event->supplier->name,
            'email' => $event->supplier->email,
            'deleted_by' => auth()->id()?->id ?? 'system',
            'deleted_at' => now()->toDateTimeString(),
        ]);
    }
}
