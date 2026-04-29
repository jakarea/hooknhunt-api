<?php

namespace App\Listeners\Order;

use App\Events\Order\OrderShipped;
use App\Jobs\SendOrderLazychatWebhook;
use Illuminate\Support\Facades\Log;

/**
 * Send Order Shipped to Lazychat Listener
 *
 * Listens for order shipped events and dispatches webhook jobs.
 * Notifies LazyChat about shipping with tracking details.
 *
 * @package App\Listeners\Order
 */
class SendOrderShippedToLazychat
{
    /**
     * Handle order shipped event.
     *
     * @param OrderShipped $event
     * @return void
     */
    public function handle(OrderShipped $event): void
    {
        Log::info('Order shipped - dispatching Lazychat webhook', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'tracking_number' => $event->trackingNumber,
            'courier' => $event->courierName,
        ]);

        // Dispatch webhook job with shipping details
        SendOrderLazychatWebhook::dispatch(
            $event->order,
            'order.shipped',
            $event->trackingNumber,
            null, // no reason for shipped
            $event->courierName, // passed as additional context
            $event->courierPartner,
            $event->trackingUrl
        );

        Log::info('Lazychat shipping webhook job dispatched', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'tracking_number' => $event->trackingNumber,
        ]);
    }
}
