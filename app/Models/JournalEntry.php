<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class JournalEntry extends Model
{
    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'entry_number',
        'date',
        'description',
        'is_reversed',
        'reference_type',
        'reference_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d', // Explicit format to prevent timezone offset
        'is_reversed' => 'boolean',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [
        'total_debit',
        'total_credit',
    ];

    /**
     * Boot method to add event listeners
     */
    protected static function boot()
    {
        parent::boot();

        // Before creating a journal entry, check if date is in a closed fiscal period
        static::creating(function ($entry) {
            if (FiscalYear::isDateInClosedPeriod($entry->date)) {
                throw new \Exception('Cannot create journal entry for a closed fiscal period (' . $entry->date . ').');
            }
        });
    }

    public function items()
    {
        return $this->hasMany(JournalItem::class);
    }

    /**
     * Get the user who created the journal entry
     */
    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who updated the journal entry
     */
    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Polymorphic Relation
    public function reference()
    {
        return $this->morphTo();
    }

    // Check if Debit == Credit (Balance Check)
    public function isBalanced()
    {
        return $this->items->sum('debit') == $this->items->sum('credit');
    }

    /**
     * Get the total debit amount for this entry
     */
    public function getTotalDebitAttribute()
    {
        return $this->items->sum('debit');
    }

    /**
     * Get the total credit amount for this entry
     */
    public function getTotalCreditAttribute()
    {
        return $this->items->sum('credit');
    }

    /**
     * Scope: Filter by date range
     */
    public function scopeDateRange(Builder $query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    /**
     * Scope: Only non-reversed entries
     */
    public function scopeNotReversed(Builder $query)
    {
        return $query->where('is_reversed', false);
    }

    /**
     * Reverse this journal entry
     * Creates a new entry with opposite debits/credits
     */
    public function reverse($reason = null, $reversedBy = null)
    {
        if ($this->is_reversed) {
            throw new \Exception('Journal entry has already been reversed.');
        }

        \DB::beginTransaction();
        try {
            // Create reversal entry
            $reversalEntry = self::create([
                'entry_number' => $this->entry_number . '-REV',
                'date' => now()->toDateString(),
                'description' => 'Reversal of: ' . $this->description . ($reason ? ' - ' . $reason : ''),
                'reference_type' => self::class,
                'reference_id' => $this->id,
                'created_by' => $reversedBy ?? auth()->id(),
            ]);

            // Create opposite journal items
            foreach ($this->items as $item) {
                JournalItem::create([
                    'journal_entry_id' => $reversalEntry->id,
                    'account_id' => $item->account_id,
                    'debit' => $item->credit, // Swap debit and credit
                    'credit' => $item->debit, // Swap credit and debit
                ]);
            }

            // Mark original entry as reversed
            $this->update(['is_reversed' => true]);

            \DB::commit();
            return $reversalEntry;
        } catch (\Exception $e) {
            \DB::rollBack();
            throw $e;
        }
    }
}