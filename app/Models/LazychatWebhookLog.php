<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Lazychat Webhook Log Model
 *
 * Tracks all webhook calls to Lazychat for debugging and monitoring.
 * Used by admin dashboard to show sync status and failures.
 *
 * @package App\Models
 */
class LazychatWebhookLog extends Model
{
    protected $fillable = [
        'product_id',
        'event_type',
        'webhook_topic',
        'payload',
        'status',
        'response_code',
        'response_body',
        'error_message',
        'attempts',
        'retry_after',
        'sent_at',
        'last_attempted_at',
        'job_id',
        'metadata',
    ];

    protected $casts = [
        'payload' => 'array',
        'response_body' => 'array',
        'metadata' => 'array',
        'sent_at' => 'datetime',
        'last_attempted_at' => 'datetime',
        'retry_after' => 'datetime',
    ];

    /**
     * Relationship to Product.
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Scope for pending webhooks.
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope for successful webhooks.
     */
    public function scopeSuccessful($query)
    {
        return $query->where('status', 'success');
    }

    /**
     * Scope for failed webhooks.
     */
    public function scopeFailed($query)
    {
        return $query->where('status', 'failed');
    }

    /**
     * Scope for specific event type.
     */
    public function scopeEventType($query, string $eventType)
    {
        return $query->where('event_type', $eventType);
    }

    /**
     * Scope for specific product.
     */
    public function scopeForProduct($query, int $productId)
    {
        return $query->where('product_id', $productId);
    }

    /**
     * Check if webhook can be retried.
     */
    public function canRetry(): bool
    {
        return $this->status === 'failed' ||
               ($this->status === 'pending' && $this->attempts < config('lazychat.retry.max_attempts', 3));
    }

    /**
     * Check if webhook is successful.
     */
    public function isSuccessful(): bool
    {
        return $this->status === 'success';
    }

    /**
     * Check if webhook is pending.
     */
    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    /**
     * Check if webhook is failed.
     */
    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }
}
