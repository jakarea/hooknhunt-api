<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $guarded = ['id'];

    // টাইম কলামগুলো কার্বন ইনস্ট্যান্সে কনভার্ট করার জন্য
    protected $casts = [
        'date' => 'date:Y-m-d', // Explicit format to prevent timezone offset
        'break_in' => 'array', // JSON array of break times
        'break_out' => 'array', // JSON array of break times
        'break_notes' => 'array', // JSON array of break notes
    ];

    /**
     * Get break_notes as array (always return array, never null)
     */
    public function getBreakNotesAttribute($value): array
    {
        // Cast handles JSON conversion, this ensures NULL becomes empty array
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            return is_array($decoded) ? $decoded : [];
        }

        return [];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Check if user is currently on break
     * Returns true if break_in has more entries than break_out
     */
    public function isOnBreak(): bool
    {
        $breakInCount = is_array($this->break_in) ? count($this->break_in) : 0;
        $breakOutCount = is_array($this->break_out) ? count($this->break_out) : 0;

        return $breakInCount > $breakOutCount;
    }

    /**
     * Get current status of attendance flow
     * Returns: 'not_started', 'clocked_in', 'on_break', 'clocked_out'
     */
    public function getCurrentStatus(): string
    {
        if (!$this->clock_in) {
            return 'not_started';
        }

        if ($this->clock_out) {
            return 'clocked_out';
        }

        if ($this->isOnBreak()) {
            return 'on_break';
        }

        return 'clocked_in';
    }

    /**
     * Check if attendance has incomplete state from previous day
     * Returns array with issues found
     */
    public function getIncompleteState(): array
    {
        $issues = [];

        if ($this->clock_in && !$this->clock_out) {
            $issues[] = 'clocked_in_without_out';
        }

        if ($this->isOnBreak()) {
            $issues[] = 'on_break_without_out';
        }

        return $issues;
    }
}