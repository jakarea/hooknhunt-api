<?php

namespace App\Modules\Finance\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use App\Modules\Finance\Models\PaymentTransaction;

class PaymentSuccessfulNotification extends Notification implements ShouldQueue
{
    use Queueable;

    protected int $orderId;
    protected array $orderData;
    protected \App\Modules\Finance\Models\PaymentTransaction $payment;

    /**
     * Create a new notification instance using order ID for module independence.
     *
     * @param int $orderId The sales order ID
     * @param \App\Modules\Finance\Models\PaymentTransaction $payment
     */
    public function __construct(int $orderId, \App\Modules\Finance\Models\PaymentTransaction $payment)
    {
        $this->orderId = $orderId;
        $this->payment = $payment;

        // Fetch order data using direct database access for module independence
        $this->orderData = DB::table('sales_orders')->where('id', $orderId)->first();
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
            ->subject('Payment Received - Order #' . $this->orderData->invoice_no)
            ->greeting('Dear ' . ($notifiable->name ?? 'Valued Customer') . ',')
            ->line('Thank you for your payment!')
            ->line('Your order details:')
            ->line('Invoice No: ' . $this->orderData->invoice_no)
            ->line('Amount: BDT ' . number_format($this->payment->amount, 2))
            ->line('Payment Method: ' . ($this->payment->payment_method ?? 'Online Payment'))
            ->line('Transaction ID: ' . $this->payment->gateway_tran_id)
            ->line('We will process your order shortly and notify you when it ships.')
            ->action('View Order', url('/store/account/orders/' . $this->orderData->invoice_no))
            ->line('If you have any questions, feel free to contact us.')
            ->salutation('Thank you for shopping with us!');
    }

    /**
     * Get the array representation of the notification.
     */
    public function toArray($notifiable): array
    {
        return [
            'order_id' => $this->orderId,
            'invoice_no' => $this->orderData->invoice_no,
            'amount' => $this->payment->amount,
            'payment_method' => $this->payment->payment_method,
            'tran_id' => $this->payment->gateway_tran_id,
        ];
    }
}
