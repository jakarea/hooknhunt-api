<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CostCenter extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'monthly_budget' => 'decimal:2',
        'actual_spent' => 'decimal:2',
        'remaining_budget' => 'decimal:2',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Cost center belongs to department
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Relationship: Cost center manager
     */
    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    /**
     * Relationship: User who created this cost center
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this cost center
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Cost center has many projects
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Relationship: Cost center has many expenses
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /**
     * Scope: Only active cost centers
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Filter by department
     */
    public function scopeOfDepartment($query, $departmentId)
    {
        return $query->where('department_id', $departmentId);
    }

    /**
     * Calculate budget utilization
     */
    public function calculateBudgetUtilization(): void
    {
        $this->actual_spent = $this->expenses()->sum('amount');
        $this->remaining_budget = $this->monthly_budget - $this->actual_spent;
        $this->save();
    }

    /**
     * Get budget utilization percentage
     */
    public function getBudgetUtilizationAttribute(): float
    {
        if ($this->monthly_budget <= 0) {
            return 0;
        }

        return ($this->actual_spent / $this->monthly_budget) * 100;
    }

    /**
     * Check if budget is exceeded
     */
    public function isOverBudget(): bool
    {
        return $this->actual_spent > $this->monthly_budget;
    }

    /**
     * Check if approaching budget limit
     */
    public function isApproachingLimit(float $threshold = 80.0): bool
    {
        return $this->budget_utilization >= $threshold;
    }

    /**
     * Generate unique cost center code
     */
    public static function generateCostCenterCode(): string
    {
        $prefix = 'CC';
        $lastCenter = self::withTrashed()->orderBy('id', 'desc')->first();

        if (!$lastCenter) {
            return $prefix . '-001';
        }

        $lastCode = $lastCenter->code;
        $lastNumber = intval(str_replace($prefix . '-', '', $lastCode));
        $newNumber = $lastNumber + 1;

        return $prefix . '-' . str_pad($newNumber, 3, '0', STR_PAD_LEFT);
    }
}
