<?php

namespace App\Modules\Website\Events\Order;

use App\Modules\Website\Models\WebsiteOrder;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Order Paid Event
 *
 * Dispatched when an order payment is successfully verified.
 * This is triggered by payment gateway callbacks (EPS IPN, SSLCommerz IPN).
 */
class OrderPaid
{
    use Dispatchable, SerializesModels;

    public \App\Modules\Website\Models\WebsiteOrder $order;
    public ?string $transactionId;
    public ?string $paymentMethod;

    /**
     * Create a new event instance.
     *
     * @param \App\Modules\Website\Models\WebsiteOrder $order The paid order
     * @param string|null $transactionId \App\Modules\Finance\Models\Payment gateway transaction ID
     * @param string|null $paymentMethod \App\Modules\Finance\Models\Payment method (eps, sslcommerz, etc.)
     */
    public function __construct(\App\Modules\Website\Models\WebsiteOrder $order, ?string $transactionId = null, ?string $paymentMethod = null)
    {
        $this->order = $order;
        $this->transactionId = $transactionId;
        $this->paymentMethod = $paymentMethod;
    }
}
