<?php

namespace App\Modules\Website\Events\Order;

use App\Modules\Website\Models\WebsiteOrder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Order Cancelled Event
 *
 * Dispatched when an order is cancelled.
 * This can be triggered by:
 * - \App\Modules\CRM\Models\Customer cancellation
 * - \App\Modules\Finance\Models\Payment gateway cancellation callback
 * - Admin cancellation
 */
class OrderCancelled
{
    use Dispatchable, SerializesModels;

    public \App\Modules\Website\Models\WebsiteOrder $order;
    public ?string $reason;
    public ?string $cancelledBy;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Website\Models\WebsiteOrder $order The cancelled order
     * @param string|null $reason Cancellation reason
     * @param string|null $cancelledBy Who cancelled (customer, admin, system)
     */
    public function __construct(\App\Modules\Website\Models\WebsiteOrder $order, ?string $reason = null, ?string $cancelledBy = null)
    {
        $this->order = $order;
        $this->reason = $reason;
        $this->cancelledBy = $cancelledBy;
    }
}
