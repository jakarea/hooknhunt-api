<?php

namespace App\Listeners\Order;

use App\Events\Order\OrderCreated;
use App\Events\Order\OrderPaid;
use App\Events\Order\OrderFailed;
use App\Events\Order\OrderCancelled;
use App\Jobs\SendOrderLazychatWebhook;
use Illuminate\Support\Facades\Log;

/**
 * Send Order to Lazychat Listener
 *
 * Handles all order-related events and dispatches webhook jobs.
 * Compatible with cPanel shared hosting (uses database queue).
 */
class SendOrderToLazychat
{
    /**
     * Handle order created event.
     */
    public function handleOrderCreated(OrderCreated $event): void
    {
        Log::info('Order created - dispatching Lazychat webhook', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
        ]);

        SendOrderLazychatWebhook::dispatch(
            $event->order,
            'order.created'
        );
    }

    /**
     * Handle order paid event.
     */
    public function handleOrderPaid(OrderPaid $event): void
    {
        Log::info('Order paid - dispatching Lazychat webhook', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'transaction_id' => $event->transactionId,
            'payment_method' => $event->paymentMethod,
        ]);

        SendOrderLazychatWebhook::dispatch(
            $event->order,
            'order.paid',
            $event->transactionId
        );
    }

    /**
     * Handle order failed event.
     */
    public function handleOrderFailed(OrderFailed $event): void
    {
        Log::info('Order failed - dispatching Lazychat webhook', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'reason' => $event->reason,
            'error_code' => $event->errorCode,
        ]);

        SendOrderLazychatWebhook::dispatch(
            $event->order,
            'order.failed',
            null,
            $event->reason
        );
    }

    /**
     * Handle order cancelled event.
     */
    public function handleOrderCancelled(OrderCancelled $event): void
    {
        Log::info('Order cancelled - dispatching Lazychat webhook', [
            'order_id' => $event->order->id,
            'invoice_no' => $event->order->invoice_no,
            'reason' => $event->reason,
            'cancelled_by' => $event->cancelledBy,
        ]);

        SendOrderLazychatWebhook::dispatch(
            $event->order,
            'order.cancelled',
            null,
            $event->reason
        );
    }
}
