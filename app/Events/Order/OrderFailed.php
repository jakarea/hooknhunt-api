<?php

namespace App\Events\Order;

use App\Models\SalesOrder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Order Failed Event
 *
 * Dispatched when payment fails for an order.
 * This is triggered by payment gateway failure callbacks.
 */
class OrderFailed
{
    use Dispatchable, SerializesModels;

    public SalesOrder $order;
    public ?string $reason;
    public ?string $errorCode;

    /**
     * Create a new event instance.
     *
     * @param SalesOrder $order The failed order
     * @param string|null $reason Failure reason
     * @param string|null $errorCode Error code from payment gateway
     */
    public function __construct(SalesOrder $order, ?string $reason = null, ?string $errorCode = null)
    {
        $this->order = $order;
        $this->reason = $reason;
        $this->errorCode = $errorCode;
    }
}
