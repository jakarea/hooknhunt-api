<?php

namespace App\Events\Order;

use App\Models\SalesOrder;
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

    public SalesOrder $order;
    public ?string $transactionId;
    public ?string $paymentMethod;

    /**
     * Create a new event instance.
     *
     * @param SalesOrder $order The paid order
     * @param string|null $transactionId Payment gateway transaction ID
     * @param string|null $paymentMethod Payment method (eps, sslcommerz, etc.)
     */
    public function __construct(SalesOrder $order, ?string $transactionId = null, ?string $paymentMethod = null)
    {
        $this->order = $order;
        $this->transactionId = $transactionId;
        $this->paymentMethod = $paymentMethod;
    }
}
