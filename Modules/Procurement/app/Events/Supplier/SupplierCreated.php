<?php

namespace App\Modules\Procurement\Events\Supplier;

use App\Modules\Procurement\Models\Supplier;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event fired when a new supplier is created.
 *
 * This event allows other parts of the system to react to supplier creation
 * without tightly coupling them to the supplier creation process.
 */
class SupplierCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     */
    public function __construct(
        public readonly \App\Modules\Procurement\Models\Supplier $supplier
    ) {}
}
