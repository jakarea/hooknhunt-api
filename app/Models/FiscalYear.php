<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class FiscalYear extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'date:Y-m-d', // Fixed timezone offset
        'end_date' => 'date:Y-m-d', // Fixed timezone offset
        'is_active' => 'boolean',
        'is_closed' => 'boolean',
        'closed_at' => 'datetime',
    ];

    /**
     * Relationship: User who created this fiscal year
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who closed this fiscal year
     */
    public function closer()
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    /**
     * Scope: Only active fiscal years
     */
    public function scopeActive(Builder $query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: Only closed fiscal years
     */
    public function scopeClosed(Builder $query)
    {
        return $query->where('is_closed', true);
    }

    /**
     * Scope: Only open fiscal years
     */
    public function scopeOpen(Builder $query)
    {
        return $query->where('is_closed', false);
    }

    /**
     * Check if a given date falls within this fiscal year
     */
    public function containsDate($date)
    {
        $date = $date instanceof \DateTime ? $date : new \DateTime($date);
        return $date->between($this->start_date, $this->end_date);
    }

    /**
     * Get the currently active fiscal year for a given date
     */
    public static function getActiveForDate($date = null)
    {
        $date = $date ?? now();
        return self::active()
            ->open()
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->first();
    }

    /**
     * Close the fiscal year
     */
    public function close($closedBy = null)
    {
        if ($this->is_closed) {
            throw new \Exception('Fiscal year is already closed.');
        }

        $this->update([
            'is_closed' => true,
            'is_active' => false,
            'closed_by' => $closedBy ?? auth()->id(),
            'closed_at' => now(),
        ]);

        return $this;
    }

    /**
     * Reopen the fiscal year (use with caution)
     */
    public function reopen()
    {
        if (!$this->is_closed) {
            throw new \Exception('Fiscal year is not closed.');
        }

        $this->update([
            'is_closed' => false,
            'is_active' => true,
            'closed_by' => null,
            'closed_at' => null,
        ]);

        return $this;
    }

    /**
     * Check if journal entry date is within a closed period
     */
    public static function isDateInClosedPeriod($date)
    {
        $date = $date instanceof \DateTime ? $date->format('Y-m-d') : $date;

        return self::closed()
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->exists();
    }
}
