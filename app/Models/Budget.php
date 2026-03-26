<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Budget extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'planned_amount' => 'decimal:2',
        'actual_amount' => 'decimal:2',
        'variance' => 'decimal:2',
        'variance_percentage' => 'decimal:2',
        'alert_threshold' => 'decimal:2',
        'alert_sent' => 'boolean',
        'start_date' => 'date:Y-m-d', // Fixed timezone offset
        'end_date' => 'date:Y-m-d', // Fixed timezone offset
        'approved_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Linked chart of account
     */
    public function chartAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    /**
     * Relationship: User who created this budget
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this budget
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: User who approved this budget
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Scope: Filter by fiscal year
     */
    public function scopeFiscalYear($query, $year)
    {
        return $query->where('fiscal_year', $year);
    }

    /**
     * Scope: Filter by period type
     */
    public function scopePeriodType($query, $type)
    {
        return $query->where('period_type', $type);
    }

    /**
     * Scope: Filter by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by scope type
     */
    public function scopeScopeType($query, $type)
    {
        return $query->where('scope_type', $type);
    }

    /**
     * Scope: Active budgets
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active')
                     ->where('start_date', '<=', now())
                     ->where('end_date', '>=', now());
    }

    /**
     * Scope: Budgets needing alert (exceed threshold)
     */
    public function scopeNeedingAlert($query)
    {
        return $query->where('alert_sent', false)
                     ->whereRaw('(actual_amount / planned_amount) * 100 >= alert_threshold');
    }

    /**
     * Calculate and update variance
     */
    public function calculateVariance(): void
    {
        $this->actual_amount = $this->actual_amount ?? 0;
        $this->variance = $this->planned_amount - $this->actual_amount;

        if ($this->planned_amount > 0) {
            $this->variance_percentage = ($this->variance / $this->planned_amount) * 100;
        } else {
            $this->variance_percentage = 0;
        }

        // Update status based on variance
        if ($this->actual_amount > $this->planned_amount) {
            $this->status = 'exceeded';
        } elseif ($this->status === 'draft' && $this->approved_at) {
            $this->status = 'active';
        }

        $this->save();
    }

    /**
     * Get usage percentage
     */
    public function getUsagePercentageAttribute(): float
    {
        if ($this->planned_amount <= 0) {
            return 0;
        }

        return ($this->actual_amount / $this->planned_amount) * 100;
    }

    /**
     * Check if budget is exceeded
     */
    public function isExceeded(): bool
    {
        return $this->actual_amount > $this->planned_amount;
    }

    /**
     * Check if alert should be sent
     */
    public function needsAlert(): bool
    {
        if ($this->alert_sent) {
            return false;
        }

        $usagePercentage = $this->usage_percentage;
        return $usagePercentage >= $this->alert_threshold;
    }

    /**
     * Mark alert as sent
     */
    public function markAlertSent(): void
    {
        $this->alert_sent = true;
        $this->save();
    }

    /**
     * Approve budget
     */
    public function approve(?int $userId = null): void
    {
        $this->status = 'active';
        $this->approved_by = $userId ?? auth()->id();
        $this->approved_at = now();
        $this->save();
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Draft',
            'active' => 'Active',
            'completed' => 'Completed',
            'exceeded' => 'Exceeded',
            default => 'Unknown',
        };
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'gray',
            'active' => $this->needsAlert() ? 'orange' : 'green',
            'completed' => 'blue',
            'exceeded' => 'red',
            default => 'gray',
        };
    }

    /**
     * Get variance status
     */
    public function getVarianceStatusAttribute(): string
    {
        if ($this->variance < 0) {
            return 'unfavorable';
        } elseif ($this->variance > 0) {
            return 'favorable';
        }
        return 'neutral';
    }

    /**
     * Get variance color
     */
    public function getVarianceColorAttribute(): string
    {
        return match ($this->variance_status) {
            'favorable' => 'green',
            'unfavorable' => 'red',
            'neutral' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Get period type label
     */
    public function getPeriodTypeLabelAttribute(): string
    {
        return match ($this->period_type) {
            'monthly' => 'Monthly',
            'quarterly' => 'Quarterly',
            'yearly' => 'Yearly',
            'custom' => 'Custom',
            default => 'Unknown',
        };
    }

    /**
     * Get scope type label
     */
    public function getScopeTypeLabelAttribute(): string
    {
        return match ($this->scope_type) {
            'company' => 'Company',
            'department' => 'Department',
            'account' => 'Account',
            default => 'Unknown',
        };
    }
}
