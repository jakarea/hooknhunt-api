<?php

namespace App\Events\Supplier;

use App\Models\Supplier;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event fired when a supplier is updated.
 *
 * This event allows other parts of the system to react to supplier updates
 * without tightly coupling them to the supplier update process.
 */
class SupplierUpdated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @param Supplier $supplier The updated supplier
     * @param array $changes The changes that were made (old => new)
     */
    public function __construct(
        public readonly Supplier $supplier,
        public readonly array $changes = []
    ) {}
}
