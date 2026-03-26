<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ReportTemplate extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'config' => 'array',
        'columns' => 'array',
        'filters' => 'array',
        'chart_config' => 'array',
        'is_system' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Template creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: Template updater
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Template has many reports
     */
    public function reports(): HasMany
    {
        return $this->hasMany(FinancialReport::class, 'template_id');
    }

    /**
     * Scope: Filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Only system templates
     */
    public function scopeSystem($query)
    {
        return $query->where('is_system', true);
    }

    /**
     * Scope: Only user templates
     */
    public function scopeUser($query)
    {
        return $query->where('is_system', false);
    }

    /**
     * Scope: Only active templates
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Filter by category
     */
    public function scopeInCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Check if template can be deleted
     */
    public function isDeletable(): bool
    {
        return !$this->is_system;
    }

    /**
     * Get type label
     */
    public function getTypeLabelAttribute(): string
    {
        return match ($this->type) {
            'comparative' => 'Comparative Statement',
            'ratio' => 'Ratio Analysis',
            'cash_flow' => 'Cash Flow Projection',
            'fund_flow' => 'Fund Flow Statement',
            'custom' => 'Custom Report',
            default => 'Unknown',
        };
    }

    /**
     * Get template preview data
     */
    public function getPreviewData(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type,
            'type_label' => $this->type_label,
            'description' => $this->description,
            'category' => $this->category,
            'columns' => $this->columns ?? [],
            'is_system' => $this->is_system,
        ];
    }
}
