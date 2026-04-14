<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use App\Models\SalesOrder;
use App\Models\PaymentTransaction;

class PaymentSuccessfulNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected SalesOrder $order;
    protected PaymentTransaction $payment;

    public function __construct(SalesOrder $order, PaymentTransaction $payment)
    {
        $this->order = $order;
        $this->payment = $payment;
    }

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail']; // Add SMS channel later if needed
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable)
    {
        return (new \Illuminate\Notifications\Messages\MailMessage)
            ->subject('Payment Received - Order #' . $this->order->invoice_no)
            ->greeting('Dear ' . ($notifiable->name ?? 'Valued Customer') . ',')
            ->line('Thank you for your payment!')
            ->line('Your order details:')
            ->line('Invoice No: ' . $this->order->invoice_no)
            ->line('Amount: BDT ' . number_format($this->payment->amount, 2))
            ->line('Payment Method: ' . ($this->payment->payment_method ?? 'Online Payment'))
            ->line('Transaction ID: ' . $this->payment->gateway_tran_id)
            ->line('We will process your order shortly and notify you when it ships.')
            ->action('View Order', url('/store/account/orders/' . $this->order->invoice_no))
            ->line('If you have any questions, feel free to contact us.')
            ->salutation('Thank you for shopping with us!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'order_id' => $this->order->id,
            'invoice_no' => $this->order->invoice_no,
            'amount' => $this->payment->amount,
            'payment_method' => $this->payment->payment_method,
            'tran_id' => $this->payment->gateway_tran_id,
        ];
    }
}
