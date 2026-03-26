<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Expense extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'amount',
        'expense_date',
        'account_id',
        'payment_account_id',  // Bank/Cash account to pay from
        'paid_by',
        'reference_number',
        'notes',
        'attachment',
        'is_approved',
        // VAT (Value Added Tax) fields
        'vat_percentage',
        'vat_amount',
        'vat_challan_no',
        // Tax (AIT) fields
        'tax_percentage',
        'tax_amount',
        'tax_challan_no',
        // Cost Center & Project Tracking
        'project_id',
        'cost_center_id',
        'expense_department_id',
        // Multi-Currency
        'currency_id',
        // Source tracking (e.g., payroll_id for salary expenses)
        'source_type',
        'source_id',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'amount' => 'decimal:2',
        'vat_percentage' => 'decimal:2',
        'vat_amount' => 'decimal:2',
        'tax_percentage' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'expense_date' => 'date:Y-m-d', // Fixed timezone offset
        'is_approved' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'paid_by_user',
    ];

    /**
     * The relationships that should always be loaded.
     *
     * @var array<string, string>
     */
    protected $with = ['account', 'paymentAccount'];

    /**
     * Relationship: Expense belongs to a Chart of Account (Expense Head)
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    /**
     * Relationship: Expense is paid from a Payment Account (Bank/Cash)
     */
    public function paymentAccount(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'payment_account_id');
    }

    /**
     * Relationship: Expense was paid by a User
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    /**
     * Accessor: Get paidBy user (alias for user relationship)
     * This provides compatibility with frontend expecting 'paidBy'
     */
    public function getPaidByUserAttribute()
    {
        // Check if the user relationship is already loaded
        if (array_key_exists('user', $this->relations)) {
            return $this->relations['user'];
        }

        // If not loaded and we have a paid_by ID, load the user
        if (isset($this->attributes['paid_by']) && $this->attributes['paid_by']) {
            return $this->user()->getResults();
        }

        return null;
    }

    /**
     * Relationship: Expense belongs to a Project
     */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Relationship: Expense belongs to a Cost Center
     */
    public function costCenter(): BelongsTo
    {
        return $this->belongsTo(CostCenter::class, 'cost_center_id');
    }

    /**
     * Relationship: Expense belongs to a Department
     */
    public function expenseDepartment(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'expense_department_id');
    }

    /**
     * Relationship: Expense currency
     */
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    /**
     * Relationship: Get the source of this expense (e.g., Payroll for salary expenses)
     */
    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope: Only approved expenses
     */
    public function scopeApproved($query)
    {
        return $query->where('is_approved', true);
    }

    /**
     * Scope: Only pending expenses
     */
    public function scopePending($query)
    {
        return $query->where('is_approved', false);
    }

    /**
     * Check if expense can be modified (only if not approved)
     */
    public function isModifiable(): bool
    {
        return !$this->is_approved;
    }

    /**
     * Get attachment URL (if stored in storage)
     */
    public function getAttachmentUrlAttribute(): string|null
    {
        if ($this->attachment) {
            return storage_path('app/public/' . $this->attachment);
        }
        return null;
    }
}
