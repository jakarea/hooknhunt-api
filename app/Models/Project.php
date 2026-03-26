<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'date:Y-m-d', // Fixed timezone offset
        'end_date' => 'date:Y-m-d', // Fixed timezone offset
        'deadline' => 'date:Y-m-d', // Fixed timezone offset
        'budget_amount' => 'decimal:2',
        'estimated_revenue' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'actual_revenue' => 'decimal:2',
        'profit' => 'decimal:2',
        'profit_margin' => 'decimal:2',
        'progress_percentage' => 'integer',
        'attachments' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Project belongs to customer
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Relationship: Project manager
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Relationship: Project belongs to department
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Relationship: Project belongs to cost center
     */
    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class);
    }

    /**
     * Relationship: User who created this project
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this project
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Project has many expenses
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Scope: Active projects
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Completed projects
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope: Filter by status
     */
    public function scopeStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Filter by customer
     */
    public function scopeCustomer($query, $customerId)
    {
        return $query->where('customer_id', $customerId);
    }

    /**
     * Scope: Filter by department
     */
    public function scopeOfDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Scope: Filter by cost center
     */
    public function scopeOfCostCenter($query, $costCenterId)
    {
        return $query->where('cost_center_id', $costCenterId);
    }

    /**
     * Scope: Filter by priority
     */
    public function scopePriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Calculate project profitability
     */
    public function calculateProfitability(): void
    {
        $this->actual_cost = $this->expenses()->sum('amount');
        $this->profit = $this->actual_revenue - $this->actual_cost;

        if ($this->estimated_revenue > 0) {
            $this->profit_margin = ($this->profit / $this->estimated_revenue) * 100;
        } else {
            $this->profit_margin = 0;
        }

        $this->save();
    }

    /**
     * Get budget utilization percentage
     */
    public function getBudgetUtilizationAttribute(): float
    {
        if ($this->budget_amount <= 0) {
            return 0;
        }

        return ($this->actual_cost / $this->budget_amount) * 100;
    }

    /**
     * Check if project is over budget
     */
    public function isOverBudget(): bool
    {
        return $this->actual_cost > $this->budget_amount;
    }

    /**
     * Get days remaining until deadline
     */
    public function getDaysRemainingAttribute(): ?int
    {
        if (!$this->deadline) {
            return null;
        }

        if ($this->deadline->isPast()) {
            return (int) $this->deadline->diffInDays(now(), false);
        }

        return (int) $this->deadline->diffInDays(now());
    }

    /**
     * Check if project is overdue
     */
    public function isOverdue(): bool
    {
        return $this->deadline && $this->deadline->isPast() && !$this->status === 'completed';
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'planning' => 'Planning',
            'active' => 'Active',
            'on_hold' => 'On Hold',
            'completed' => 'Completed',
            'cancelled' => 'Cancelled',
            default => 'Unknown',
        };
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeAttribute(): string
    {
        return match ($this->status) {
            'planning' => 'blue',
            'active' => $this->isOverdue() ? 'red' : 'green',
            'on_hold' => 'yellow',
            'completed' => 'cyan',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }

    /**
     * Get priority label
     */
    public function getPriorityLabelAttribute(): string
    {
        return match ($this->priority) {
            'low' => 'Low',
            'medium' => 'Medium',
            'high' => 'High',
            'urgent' => 'Urgent',
            default => 'Unknown',
        };
    }

    /**
     * Get priority color
     */
    public function getPriorityColorAttribute(): string
    {
        return match ($this->priority) {
            'low' => 'gray',
            'medium' => 'blue',
            'high' => 'orange',
            'urgent' => 'red',
            default => 'gray',
        };
    }

    /**
     * Generate unique project code
     */
    public static function generateProjectCode(): string
    {
        $prefix = 'PRJ';
        $lastProject = self::withTrashed()->orderBy('id', 'desc')->first();

        if (!$lastProject) {
            return $prefix . '-0001';
        }

        $lastCode = $lastProject->code;
        $lastNumber = intval(str_replace($prefix . '-', '', $lastCode));
        $newNumber = $lastNumber + 1;

        return $prefix . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }
}
