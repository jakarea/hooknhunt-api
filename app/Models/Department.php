<?php

namespace App\Models;

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
     * Get all users belonging to this department
     */
    public function users()
    {
        return $this->hasManyThrough(
            User::class,
            StaffProfile::class,
            'department_id',
            'id',
            'id',
            'user_id'
        );
    }

    /**
     * Department has many expenses
     */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'expense_department_id');
    }

    /**
     * Department has many cost centers
     */
    public function costCenters(): HasMany
    {
        return $this->hasMany(CostCenter::class);
    }

    /**
     * Department has many projects
     */
    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    /**
     * Calculate total expenses for this department
     */
    public function getTotalExpensesAttribute(): float
    {
        return (float) $this->expenses()->sum('amount');
    }
}