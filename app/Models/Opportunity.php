<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Opportunity extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'lead_id',
        'customer_id',
        'title',
        'description',
        'value',
        'currency',
        'probability',
        'expected_close_date',
        'stage',
        'stage_order',
        'source',
        'lost_reason',
        'assigned_to',
        'created_by',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'value' => 'decimal:2',
        'probability' => 'integer',
        'expected_close_date' => 'date:Y-m-d', // Fixed timezone offset
        'stage_order' => 'integer',
    ];

    /**
     * Get the lead associated with the opportunity.
     */
    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    /**
     * Get the customer associated with the opportunity.
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    /**
     * Get the assigned staff member.
     */
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Get the creator of the opportunity.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get all quotations for the opportunity.
     */
    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    /**
     * Move to next stage
     */
    public function moveToNextStage(): void
    {
        $stages = ['qualification', 'proposal', 'negotiation', 'closed_won'];
        $currentIndex = array_search($this->stage, $stages);

        if ($currentIndex !== false && $currentIndex < count($stages) - 1) {
            $this->update([
                'stage' => $stages[$currentIndex + 1],
                'stage_order' => $currentIndex + 2,
            ]);
        }
    }

    /**
     * Mark as lost
     */
    public function markAsLost(string $reason): void
    {
        $this->update([
            'stage' => 'closed_lost',
            'lost_reason' => $reason,
            'probability' => 0,
        ]);
    }

    /**
     * Mark as won
     */
    public function markAsWon(): void
    {
        $this->update([
            'stage' => 'closed_won',
            'probability' => 100,
        ]);
    }

    /**
     * Scope to filter by stage
     */
    public function scopeInStage($query, string $stage)
    {
        return $query->where('stage', $stage);
    }

    /**
     * Scope to get open opportunities
     */
    public function scopeOpen($query)
    {
        return $query->whereIn('stage', ['qualification', 'proposal', 'negotiation']);
    }

    /**
     * Scope to get won opportunities
     */
    public function scopeWon($query)
    {
        return $query->where('stage', 'closed_won');
    }

    /**
     * Scope to get lost opportunities
     */
    public function scopeLost($query)
    {
        return $query->where('stage', 'closed_lost');
    }

    /**
     * Scope to get high value opportunities
     */
    public function scopeHighValue($query, float $threshold = 100000)
    {
        return $query->where('value', '>=', $threshold);
    }
}
