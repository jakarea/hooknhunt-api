<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cheque extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'issue_date' => 'date:Y-m-d', // Fixed timezone offset
        'due_date' => 'date:Y-m-d', // Fixed timezone offset
        'amount' => 'decimal:2',
        'deposit_date' => 'date:Y-m-d', // Fixed timezone offset
        'clearance_date' => 'date:Y-m-d', // Fixed timezone offset
        'alert_sent' => 'boolean',
        'alert_sent_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Cheque belongs to a Bank
     */
    public function bank(): BelongsTo
    {
        return $this->belongsTo(Bank::class, 'bank_id');
    }

    /**
     * Relationship: User who created this cheque
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this cheque
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope: Only pending cheques
     */
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    /**
     * Scope: Only deposited cheques
     */
    public function scopeDeposited($query)
    {
        return $query->where('status', 'deposited');
    }

    /**
     * Scope: Only cleared cheques
     */
    public function scopeCleared($query)
    {
        return $query->where('status', 'cleared');
    }

    /**
     * Scope: Only bounced cheques
     */
    public function scopeBounced($query)
    {
        return $query->whereIn('status', ['bounced', 'dishonored']);
    }

    /**
     * Scope: Only cancelled cheques
     */
    public function scopeCancelled($query)
    {
        return $query->where('status', 'cancelled');
    }

    /**
     * Scope: Only incoming cheques
     */
    public function scopeIncoming($query)
    {
        return $query->where('type', 'incoming');
    }

    /**
     * Scope: Only outgoing cheques
     */
    public function scopeOutgoing($query)
    {
        return $query->where('type', 'outgoing');
    }

    /**
     * Scope: Due cheques (due date is today or past)
     */
    public function scopeDue($query)
    {
        return $query->where('due_date', '<=', now())
                     ->where('status', 'pending');
    }

    /**
     * Scope: Upcoming cheques (due date is in future)
     */
    public function scopeUpcoming($query, $days = 7)
    {
        return $query->whereBetween('due_date', [now(), now()->addDays($days)])
                     ->where('status', 'pending');
    }

    /**
     * Scope: Overdue cheques (due date passed but still pending)
     */
    public function scopeOverdue($query)
    {
        return $query->where('due_date', '<', now())
                     ->where('status', 'pending');
    }

    /**
     * Scope: Filter by bank
     */
    public function scopeFromBank($query, $bankId)
    {
        return $query->where('bank_id', $bankId);
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeDueBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('due_date', [$startDate, $endDate]);
    }

    /**
     * Check if cheque is due today
     */
    public function isDueToday(): bool
    {
        return $this->due_date->isToday() && $this->status === 'pending';
    }

    /**
     * Check if cheque is overdue
     */
    public function isOverdue(): bool
    {
        return $this->due_date->isPast() && $this->status === 'pending';
    }

    /**
     * Check if cheque is upcoming (within N days)
     */
    public function isUpcoming(int $days = 7): bool
    {
        return $this->due_date->isFuture() &&
               $this->due_date->lte(now()->addDays($days)) &&
               $this->status === 'pending';
    }

    /**
     * Get days until due
     */
    public function getDaysUntilDueAttribute(): int
    {
        if ($this->due_date->isPast()) {
            return (int) $this->due_date->diffInDays(now(), false);
        }
        return (int) $this->due_date->diffInDays(now());
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeAttribute(): string
    {
        return match ($this->status) {
            'pending' => $this->isOverdue() ? 'red' : ($this->isDueToday() ? 'orange' : 'yellow'),
            'deposited' => 'blue',
            'cleared' => 'green',
            'bounced', 'dishonored' => 'red',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => $this->isOverdue() ? 'Overdue' : ($this->isDueToday() ? 'Due Today' : 'Pending'),
            'deposited' => 'Deposited',
            'cleared' => 'Cleared',
            'bounced' => 'Bounced',
            'dishonored' => 'Dishonored',
            'cancelled' => 'Cancelled',
            default => 'Unknown',
        };
    }

    /**
     * Mark cheque as deposited
     */
    public function markAsDeposited(?string $depositDate = null): void
    {
        $this->status = 'deposited';
        $this->deposit_date = $depositDate ?? now()->toDateString();
        $this->save();
    }

    /**
     * Mark cheque as cleared
     */
    public function markAsCleared(?string $clearanceDate = null): void
    {
        $this->status = 'cleared';
        $this->clearance_date = $clearanceDate ?? now()->toDateString();
        $this->deposit_date = $this->deposit_date ?? now()->toDateString();
        $this->save();
    }

    /**
     * Mark cheque as bounced
     */
    public function markAsBounced(string $reason): void
    {
        $this->status = 'bounced';
        $this->bounce_reason = $reason;
        $this->save();
    }

    /**
     * Cancel cheque
     */
    public function cancel(): void
    {
        $this->status = 'cancelled';
        $this->save();
    }

    /**
     * Mark alert as sent
     */
    public function markAlertSent(): void
    {
        $this->alert_sent = true;
        $this->alert_sent_at = now();
        $this->save();
    }

    /**
     * Get cheques needing alerts (due within N days)
     */
    public static function getChequesNeedingAlert(int $days = 3): \Illuminate\Database\Eloquent\Collection
    {
        return self::pending()
            ->upcoming($days)
            ->where('alert_sent', false)
            ->get();
    }

    /**
     * Get overdue cheques
     */
    public static function getOverdueCheques(): \Illuminate\Database\Eloquent\Collection
    {
        return self::overdue()->get();
    }

    /**
     * Get type label
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'incoming' => 'Incoming (Receive)',
            'outgoing' => 'Outgoing (Payment)',
            default => 'Unknown',
        };
    }
}
