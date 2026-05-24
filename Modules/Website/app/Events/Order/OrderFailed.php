<?php

namespace App\Modules\Website\Events\Order;

use App\Modules\Website\Models\WebsiteOrder;
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

    public \App\Modules\Website\Models\WebsiteOrder $order;
    public ?string $reason;
    public ?string $errorCode;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Website\Models\WebsiteOrder $order The failed order
     * @param string|null $reason Failure reason
     * @param string|null $errorCode Error code from payment gateway
     */
    public function __construct(\App\Modules\Website\Models\WebsiteOrder $order, ?string $reason = null, ?string $errorCode = null)
    {
        $this->order = $order;
        $this->reason = $reason;
        $this->errorCode = $errorCode;
    }
}
