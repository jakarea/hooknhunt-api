<?php

namespace App\Modules\Website\Listeners\Order;

use App\Modules\Website\Events\Order\OrderCreated;
use App\Modules\Website\Events\Order\OrderPaid;
use App\Modules\Website\Events\Order\OrderFailed;
use App\Modules\Website\Events\Order\OrderCancelled;
use App\Services\ThirdParty\LazychatService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Config;

/**
 * Send Order to Lazychat Listener (cPanel Friendly - Synchronous)
 *
 * Handles all order-related events and sends webhooks immediately.
 * Compatible with shared cPanel hosting where Supervisor is not available.
 */
class SendOrderToLazychat
{
    private LazychatService $lazychatService;

    public function __construct(LazychatService $lazychatService)
    {
        $this->lazychatService = $lazychatService;
    }

    /**
     * Handle order created event.
     */
    public function handleOrderCreated(OrderCreated $event): void
    {
        if (!Config::get('lazychat.enabled', true)) {
            return;
        }

        Log::info('Order created - sending Lazychat webhook (sync)', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
        ]);

        $payload = $this->lazychatService->transformOrderForLazychat($event->order);
        $this->lazychatService->sendOrderWebhook('order/create', $payload);
    }

    /**
     * Handle order paid event.
     */
    public function handleOrderPaid(OrderPaid $event): void
    {
        if (!Config::get('lazychat.enabled', true)) {
            return;
        }

        Log::info('Order paid - sending Lazychat webhook (sync)', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'transaction_id' => $event->transactionId,
            'payment_method' => $event->paymentMethod,
        ]);

        $payload = $this->lazychatService->transformOrderForLazychat($event->order);
        $this->lazychatService->sendOrderWebhook('order/paid', $payload);
    }

    /**
     * Handle order failed event.
     */
    public function handleOrderFailed(OrderFailed $event): void
    {
        if (!Config::get('lazychat.enabled', true)) {
            return;
        }

        Log::info('Order failed - sending Lazychat webhook (sync)', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'reason' => $event->reason,
            'error_code' => $event->errorCode,
        ]);

        $payload = $this->lazychatService->transformOrderForLazychat($event->order);
        $this->lazychatService->sendOrderWebhook('order/failed', $payload);
    }

    /**
     * Handle order cancelled event.
     */
    public function handleOrderCancelled(OrderCancelled $event): void
    {
        if (!Config::get('lazychat.enabled', true)) {
            return;
        }

        Log::info('Order cancelled - sending Lazychat webhook (sync)', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'reason' => $event->reason,
            'cancelled_by' => $event->cancelledBy,
        ]);

        $payload = $this->lazychatService->transformOrderForLazychat($event->order);
        $this->lazychatService->sendOrderWebhook('order/cancelled', $payload);
    }
}
