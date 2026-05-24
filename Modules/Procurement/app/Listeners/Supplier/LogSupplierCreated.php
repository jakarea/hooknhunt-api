<?php

namespace App\Modules\Procurement\Listeners\Supplier;

use App\Modules\Procurement\Events\Supplier\SupplierCreated;
use Illuminate\Support\Facades\Log;

/**
 * Log when a new supplier is created.
 *
 * This listener runs asynchronously to avoid slowing down
 * the supplier creation process.
 */
class LogSupplierCreated
{
    /**
     * Handle the event.
     */
    public function handle(SupplierCreated $event): void
    {
        Log::info('\App\Modules\Procurement\Models\Supplier created', [
            'supplier_id' => $event->supplier->id,
            'name' => $event->supplier->name,
            'email' => $event->supplier->email,
            'created_by' => auth()->id()?->id ?? 'system',
            'created_at' => now()->toDateTimeString(),
        ]);
    }
}
