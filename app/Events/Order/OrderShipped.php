<?php

namespace App\Events\Order;

use App\Models\SalesOrder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Order Shipped Event
 *
 * Dispatched when an order is shipped/dispatched via courier.
 * This includes tracking number and courier details for customer notification.
 *
 * Triggered by:
 * - Admin marks order as "shipped"
 * - Courier integration (Steadfast/Packzy) confirms order pickup
 */
class OrderShipped
{
    use Dispatchable, SerializesModels;

    public SalesOrder $order;
    public ?string $trackingNumber;
    public ?string $courierName;
    public ?string $courierPartner;
    public ?string $trackingUrl;

    /**
     * Create a new event instance.
     *
     * @param SalesOrder $order The shipped order
     * @param string|null $trackingNumber Courier tracking number
     * @param string|null $courierName Courier name (Steadfast, Pathao, etc.)
     * @param string|null $courierPartner Courier partner (Packzy, Paperfly, etc.)
     * @param string|null $trackingUrl Tracking URL if available
     */
    public function __construct(
        SalesOrder $order,
        ?string $trackingNumber = null,
        ?string $courierName = null,
        ?string $courierPartner = null,
        ?string $trackingUrl = null
    ) {
        $this->order = $order;
        $this->trackingNumber = $trackingNumber;
        $this->courierName = $courierName;
        $this->courierPartner = $courierPartner;
        $this->trackingUrl = $trackingUrl;
    }
}
