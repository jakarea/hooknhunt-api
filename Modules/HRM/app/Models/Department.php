<?php

namespace App\Modules\HRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Department extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Department has many employees (through user profiles)
     */
    public function employees()
    {
        return $this->hasMany(StaffProfile::class, 'department_id');
    }

    /**
     * Get all users belonging to this department (Core dependency only)
     */
    public function users()
    {
        return $this->hasManyThrough(
            \App\Modules\System\Models\User::class,
            StaffProfile::class,
            'department_id',
            'id',
            'id',
            'user_id'
        );
    }

    // Expense relationship removed (Finance module dependency breaks independence)
    // Use expense_department_id directly or API calls to Finance module
    // public function expenses(): HasMany
    // {
    //     return $this->hasMany(Expense::class, 'expense_department_id');
    // }

    // CostCenter relationship removed (unknown module - breaks independence)
    // Use cost_center_id directly or API calls
    // public function costCenters(): HasMany
    // {
    //     return $this->hasMany(CostCenter::class);
    // }

    // Project relationship removed (unknown module - breaks independence)
    // Use project_id directly or API calls
    // public function projects(): HasMany
    // {
    //     return $this->hasMany(Project::class);
    // }

    // getTotalExpensesAttribute removed (Finance module dependency breaks independence)
    // Use API calls to Finance module or direct expense_department_id queries
    // public function getTotalExpensesAttribute(): float
    // {
    //     return (float) $this->expenses()->sum('amount');
    // }
}