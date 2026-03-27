<?php

namespace App\Events\Supplier;

use App\Models\Supplier;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event fired when a supplier is deleted.
 *
 * This event allows other parts of the system to react to supplier deletion
 * without tightly coupling them to the supplier deletion process.
 */
class SupplierDeleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Create a new event instance.
     *
     * @param Supplier $supplier The supplier that was deleted (still accessible in memory)
     * @param int $supplierId The ID of the deleted supplier (for reference after deletion)
     */
    public function __construct(
        public readonly Supplier $supplier,
        public readonly int $supplierId
    ) {}
}
