<?php

namespace App\Modules\Website\Services;

use App\Modules\Finance\Models\PaymentTransaction;
use App\Modules\Website\Models\WebsiteOrder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class PaymentLinkService
{
    /**
     * Generate a unique payment link for an order
     *
     * @param WebsiteOrder $order
     * @param float|null $customAmount (optional, for partial payments)
     * @return array ['token' => string, 'url' => string, 'expires_at' => datetime]
     */
    public static function generatePaymentLink(WebsiteOrder $order, ?float $customAmount = null): array
    {
        // Use order total if custom amount not provided
        $amount = $customAmount ?? $order->total_amount;

        // Validate amount is not more than order total
        if ($amount > $order->total_amount) {
            throw new \Exception('Payment link amount cannot exceed order total');
        }

        // Generate unique token (32 characters)
        $token = Str::random(32);

        // Ensure token is truly unique
        while (PaymentTransaction::where('payment_link_token', $token)->exists()) {
            $token = Str::random(32);
        }

        // Create PaymentTransaction record with link details
        $paymentTransaction = PaymentTransaction::create([
            'sales_order_id' => $order->id,
            'customer_id' => $order->customer_id,
            'gateway' => 'payment_link',
            'amount' => (float)$amount,
            'currency' => 'BDT',
            'status' => 'pending',
            'payment_link_token' => $token,
            'link_amount' => (float)$amount,
            'link_expires_at' => now()->addDays(7),
            'customer_name' => $order->customer_name,
            'customer_email' => $order->customer_email,
            'customer_phone' => $order->customer_phone,
        ]);

        Log::info('Payment link generated', [
            'order_id' => $order->id,
            'token' => $token,
            'amount' => $amount,
            'expires_at' => $paymentTransaction->link_expires_at
        ]);

        return [
            'token' => $token,
            'url' => env('FRONTEND_URL', 'http://localhost:3000') . '/checkout?order=' . $order->id . '&link=' . $token,
            'expires_at' => $paymentTransaction->link_expires_at,
            'amount' => $amount,
        ];
    }

    /**
     * Validate payment link token
     *
     * @param string $token
     * @return array|null ['transaction' => PaymentTransaction, 'order' => WebsiteOrder, 'valid' => bool, 'reason' => string]
     */
    public static function validatePaymentLink(string $token): ?array
    {
        // Find payment transaction with this token
        $transaction = PaymentTransaction::where('payment_link_token', $token)
            ->where('status', 'pending')
            ->first();

        if (!$transaction) {
            return [
                'valid' => false,
                'reason' => 'Payment link not found or already used',
                'transaction' => null,
                'order' => null,
            ];
        }

        // Check if link has expired
        if ($transaction->link_expires_at && $transaction->link_expires_at->isPast()) {
            return [
                'valid' => false,
                'reason' => 'Payment link has expired',
                'transaction' => $transaction,
                'order' => null,
            ];
        }

        // Get associated order
        $order = WebsiteOrder::find($transaction->sales_order_id);
        if (!$order) {
            return [
                'valid' => false,
                'reason' => 'Order not found',
                'transaction' => $transaction,
                'order' => null,
            ];
        }

        return [
            'valid' => true,
            'reason' => null,
            'transaction' => $transaction,
            'order' => $order,
        ];
    }

    /**
     * Mark payment link as used
     *
     * @param string $token
     * @return bool
     */
    public static function markLinkAsUsed(string $token): bool
    {
        return (bool) PaymentTransaction::where('payment_link_token', $token)
            ->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);
    }

    /**
     * Get payment links for an order
     *
     * @param WebsiteOrder $order
     * @return \Illuminate\Database\Eloquent\Collection
     */
    public static function getOrderPaymentLinks(WebsiteOrder $order)
    {
        return PaymentTransaction::where('sales_order_id', $order->id)
            ->where('payment_link_token', '!=', null)
            ->orderByDesc('created_at')
            ->get();
    }
}
