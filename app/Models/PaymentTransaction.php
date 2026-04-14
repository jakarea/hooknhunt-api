<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Enums\PaymentGateway;
use App\Enums\PaymentStatus;

class PaymentTransaction extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'refund_amount' => 'decimal:2',
        'customer_address' => 'array',
        'gateway_response' => 'array',
        'paid_at' => 'datetime',
        'failed_at' => 'datetime',
        'refunded_at' => 'datetime',
    ];

    /**
     * Get the sales order for this payment.
     */
    public function salesOrder(): BelongsTo
    {
        return $this->belongsTo(SalesOrder::class);
    }

    /**
     * Get the customer for this payment.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Get the user for this payment (nullable for guest).
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Check if payment is successful.
     */
    public function isPaid(): bool
    {
        return $this->status === PaymentStatus::PAID->value;
    }

    /**
     * Check if payment is pending.
     */
    public function isPending(): bool
    {
        return $this->status === PaymentStatus::PENDING->value;
    }

    /**
     * Check if payment failed.
     */
    public function isFailed(): bool
    {
        return $this->status === PaymentStatus::FAILED->value;
    }

    /**
     * Check if payment has EMI.
     */
    public function hasEMI(): bool
    {
        return !is_null($this->emi_tenure) && $this->emi_tenure > 0;
    }

    /**
     * Scope: Paid payments.
     */
    public function scopePaid($query)
    {
        return $query->where('status', PaymentStatus::PAID->value);
    }

    /**
     * Scope: Pending payments.
     */
    public function scopePending($query)
    {
        return $query->where('status', PaymentStatus::PENDING->value);
    }

    /**
     * Scope: Failed payments.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', PaymentStatus::FAILED->value);
    }

    /**
     * Scope: By gateway.
     */
    public function scopeByGateway($query, PaymentGateway $gateway)
    {
        return $query->where('gateway', $gateway->value);
    }

    /**
     * Mark payment as paid.
     */
    public function markAsPaid(array $gatewayResponse): bool
    {
        return $this->update([
            'status' => PaymentStatus::PAID->value,
            'paid_at' => now(),
            'gateway_response' => $gatewayResponse,
            'gateway_tran_id' => $gatewayResponse['tran_id'] ?? null,
            'payment_method' => $gatewayResponse['card_type'] ?? $gatewayResponse['payment_method'] ?? null,
        ]);
    }

    /**
     * Mark payment as failed.
     */
    public function markAsFailed(string $reason, array $gatewayResponse = null): bool
    {
        return $this->update([
            'status' => PaymentStatus::FAILED->value,
            'failed_at' => now(),
            'failed_reason' => $reason,
            'gateway_response' => $gatewayResponse ?? $this->gateway_response,
        ]);
    }

    /**
     * Mark payment as cancelled.
     */
    public function markAsCancelled(): bool
    {
        return $this->update([
            'status' => PaymentStatus::CANCELLED->value,
        ]);
    }

    /**
     * Process refund.
     */
    public function processRefund(float $amount, string $reason, string $refundTranId = null): bool
    {
        return $this->update([
            'status' => $this->amount - $amount <= 0.01 ? PaymentStatus::REFUNDED->value : PaymentStatus::PAID->value,
            'refund_amount' => $amount,
            'refunded_at' => now(),
            'refund_tran_id' => $refundTranId,
            'refund_reason' => $reason,
        ]);
    }
}
