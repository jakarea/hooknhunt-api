<?php

namespace App\Events\Order;

use App\Models\SalesOrder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Order Created Event
 *
 * Dispatched when a new order is placed (COD or payment gateway).
 * This event is triggered immediately after order creation in OrderController.
 */
class OrderCreated
{
    use Dispatchable, SerializesModels;

    public SalesOrder $order;

    /**
     * Create a new event instance.
     *
     * @param SalesOrder $order The newly created order
     */
    public function __construct(SalesOrder $order)
    {
        $this->order = $order;
    }
}
