<?php

namespace App\Modules\Website\Listeners\Order;

use App\Modules\Website\Events\Order\OrderShipped;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

/**
 * Send Order Shipped to Lazychat Listener (cPanel Friendly - Synchronous)
 *
 * Listens for order shipped events and sends webhooks immediately.
 * Notifies LazyChat about shipping with tracking details.
 *
 * @package App\Listeners\Order
 */
class SendOrderShippedToLazychat
{
    private LazychatService $lazychatService;

    public function __construct(LazychatService $lazychatService)
    {
        $this->lazychatService = $lazychatService;
    }

    /**
     * Handle order shipped event.
     *
     * @param OrderShipped $event
     * @return void
     */
    public function handle(OrderShipped $event): void
    {
        if (!Config::get('lazychat.enabled', true)) {
            return;
        }

        Log::info('Order shipped - sending Lazychat webhook (sync)', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'tracking_number' => $event->trackingNumber,
            'courier' => $event->courierName,
        ]);

        // Transform order and add shipping details
        $payload = $this->lazychatService->transformOrderForLazychat($event->order);
        $payload['shipping']['tracking_number'] = $event->trackingNumber;
        $payload['shipping']['courier'] = $event->courierName;
        $payload['shipping']['courier_partner'] = $event->courierPartner;
        $payload['shipping']['tracking_url'] = $event->trackingUrl;

        // Send webhook
        $this->lazychatService->sendOrderWebhook('order/shipped', $payload);

        Log::info('Lazychat shipping webhook sent (sync)', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'tracking_number' => $event->trackingNumber,
        ]);
    }
}
