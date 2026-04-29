<?php

namespace App\Events\Order;

use App\Models\SalesOrder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Order Cancelled Event
 *
 * Dispatched when an order is cancelled.
 * This can be triggered by:
 * - Customer cancellation
 * - Payment gateway cancellation callback
 * - Admin cancellation
 */
class OrderCancelled
{
    use Dispatchable, SerializesModels;

    public SalesOrder $order;
    public ?string $reason;
    public ?string $cancelledBy;

    /**
     * Create a new event instance.
     *
     * @param SalesOrder $order The cancelled order
     * @param string|null $reason Cancellation reason
     * @param string|null $cancelledBy Who cancelled (customer, admin, system)
     */
    public function __construct(SalesOrder $order, ?string $reason = null, ?string $cancelledBy = null)
    {
        $this->order = $order;
        $this->reason = $reason;
        $this->cancelledBy = $cancelledBy;
    }
}
