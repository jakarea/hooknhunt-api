<?php

namespace App\Modules\Website\Events\Order;

use App\Modules\Website\Models\WebsiteOrder;
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

    public \App\Modules\Website\Models\WebsiteOrder $order;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Website\Models\WebsiteOrder $order The newly created order
     */
    public function __construct(\App\Modules\Website\Models\WebsiteOrder $order)
    {
        $this->order = $order;
    }
}
