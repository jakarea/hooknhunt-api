<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FinancialReport extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'config' => 'array',
        'columns' => 'array',
        'filters' => 'array',
        'data' => 'array',
        'summary' => 'array',
        'start_date' => 'date:Y-m-d', // Fixed timezone offset
        'end_date' => 'date:Y-m-d', // Fixed timezone offset
        'compare_start_date' => 'date:Y-m-d', // Fixed timezone offset
        'compare_end_date' => 'date:Y-m-d', // Fixed timezone offset
        'generated_at' => 'datetime',
        'is_scheduled' => 'boolean',
        'next_run_date' => 'date:Y-m-d', // Fixed timezone offset
        'last_run_date' => 'date:Y-m-d', // Fixed timezone offset
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Report creator
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: Report updater
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Relationship: Report template
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'template_id');
    }

    /**
     * Scope: Filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope: Filter by status
     */
    public function scopeWithStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope: Scheduled reports
     */
    public function scopeScheduled($query)
    {
        return $query->where('is_scheduled', true);
    }

    /**
     * Scope: Reports due to run
     */
    public function scopeDueToRun($query)
    {
        return $query->where('is_scheduled', true)
            ->where('next_run_date', '<=', now());
    }

    /**
     * Scope: Generated reports
     */
    public function scopeGenerated($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Check if report is ready to be generated
     */
    public function isReadyToGenerate(): bool
    {
        return $this->status === 'pending' || $this->status === 'failed';
    }

    /**
     * Check if report is currently generating
     */
    public function isGenerating(): bool
    {
        return $this->status === 'generating';
    }

    /**
     * Check if report generation completed
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Get report duration in seconds
     */
    public function getGenerationDurationAttribute(): ?int
    {
        if (!$this->created_at || !$this->generated_at) {
            return null;
        }

        return $this->created_at->diffInSeconds($this->generated_at);
    }

    /**
     * Get report type label
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
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pending',
            'generating' => 'Generating',
            'completed' => 'Completed',
            'failed' => 'Failed',
            default => 'Unknown',
        };
    }

    /**
     * Get status color
     */
    public function getStatusColorAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'gray',
            'generating' => 'blue',
            'completed' => 'green',
            'failed' => 'red',
            default => 'gray',
        };
    }

    /**
     * Mark report as generating
     */
    public function markAsGenerating(): void
    {
        $this->status = 'generating';
        $this->save();
    }

    /**
     * Mark report as completed with data
     */
    public function markAsCompleted(array $data, array $summary = []): void
    {
        $this->status = 'completed';
        $this->data = $data;
        $this->summary = $summary;
        $this->generated_at = now();
        $this->save();
    }

    /**
     * Mark report as failed
     */
    public function markAsFailed(string $error = null): void
    {
        $this->status = 'failed';
        if ($error) {
            $this->summary = ['error' => $error];
        }
        $this->save();
    }

    /**
     * Update next run date for scheduled reports
     */
    public function updateNextRunDate(): void
    {
        if (!$this->is_scheduled || !$this->schedule_frequency) {
            return;
        }

        $this->next_run_date = match ($this->schedule_frequency) {
            'daily' => now()->addDay(),
            'weekly' => now()->addWeek(),
            'monthly' => now()->addMonth(),
            'quarterly' => now()->addQuarter(),
            default => null,
        };

        $this->save();
    }
}
