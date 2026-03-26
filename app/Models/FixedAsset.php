<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class FixedAsset extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected $casts = [
        'purchase_date' => 'date:Y-m-d', // Fixed timezone offset
        'purchase_price' => 'decimal:2',
        'salvage_value' => 'decimal:2',
        'depreciation_rate' => 'decimal:2',
        'accumulated_depreciation' => 'decimal:2',
        'net_book_value' => 'decimal:2',
        'disposal_date' => 'date:Y-m-d', // Fixed timezone offset
        'disposal_value' => 'decimal:2',
        'warranty_expiry' => 'date:Y-m-d', // Fixed timezone offset
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    /**
     * Relationship: Asset belongs to Chart of Account
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(ChartOfAccount::class, 'account_id');
    }

    /**
     * Relationship: User who created this asset
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Relationship: User who last updated this asset
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Scope: Only active assets
     */
    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    /**
     * Scope: Only disposed assets
     */
    public function scopeDisposed($query)
    {
        return $query->whereIn('status', ['disposed', 'sold', 'scrapped', 'lost']);
    }

    /**
     * Scope: Filter by category
     */
    public function scopeOfCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Scope: Filter by location
     */
    public function scopeAtLocation($query, $location)
    {
        return $query->where('location', $location);
    }

    /**
     * Scope: Filter by purchase date range
     */
    public function scopePurchasedBetween($query, $startDate, $endDate)
    {
        return $query->whereBetween('purchase_date', [$startDate, $endDate]);
    }

    /**
     * Calculate annual depreciation expense
     */
    public function calculateAnnualDepreciation(): float
    {
        if ($this->depreciation_method === 'none') {
            return 0;
        }

        return match ($this->depreciation_method) {
            'straight_line' => $this->calculateStraightLineDepreciation(),
            'declining_balance' => $this->calculateDecliningBalanceDepreciation(),
            'units_of_production' => $this->calculateUnitsOfProductionDepreciation(),
            default => 0,
        };
    }

    /**
     * Calculate depreciation using Straight Line Method
     * Formula: (Cost - Salvage Value) / Useful Life
     */
    public function calculateStraightLineDepreciation(): float
    {
        if ($this->useful_life <= 0) {
            return 0;
        }

        $depreciableAmount = $this->purchase_price - $this->salvage_value;
        $annualDepreciation = $depreciableAmount / $this->useful_life;

        return max(0, $annualDepreciation);
    }

    /**
     * Calculate depreciation using Declining Balance Method
     * Formula: Book Value * Depreciation Rate
     */
    public function calculateDecliningBalanceDepreciation(): float
    {
        $currentBookValue = $this->net_book_value;
        $rate = $this->depreciation_rate > 0 ? $this->depreciation_rate / 100 : 10;

        $annualDepreciation = $currentBookValue * $rate;

        // Ensure depreciation doesn't reduce below salvage value
        $maxDepreciation = $currentBookValue - $this->salvage_value;
        return max(0, min($annualDepreciation, $maxDepreciation));
    }

    /**
     * Calculate depreciation using Units of Production Method
     * (Placeholder - requires usage tracking)
     */
    public function calculateUnitsOfProductionDepreciation(): float
    {
        // This would require tracking units produced/hours used
        // For now, fall back to straight line
        return $this->calculateStraightLineDepreciation();
    }

    /**
     * Calculate accumulated depreciation to date
     */
    public function calculateAccumulatedDepreciation(): float
    {
        if ($this->depreciation_method === 'none') {
            return 0;
        }

        $yearsElapsed = $this->purchase_date->diffInYears(now());
        $annualDepreciation = $this->calculateAnnualDepreciation();

        // For declining balance, we need to calculate year by year
        if ($this->depreciation_method === 'declining_balance') {
            $bookValue = $this->purchase_price;
            $totalDepreciation = 0;
            $rate = $this->depreciation_rate > 0 ? $this->depreciation_rate / 100 : 0.10;

            for ($year = 1; $year <= $yearsElapsed; $year++) {
                $yearDepreciation = $bookValue * $rate;
                $maxDepreciation = $bookValue - $this->salvage_value;
                $yearDepreciation = min($yearDepreciation, $maxDepreciation);

                $totalDepreciation += $yearDepreciation;
                $bookValue -= $yearDepreciation;

                if ($bookValue <= $this->salvage_value) {
                    break;
                }
            }

            return $totalDepreciation;
        }

        $accumulatedDepreciation = $annualDepreciation * $yearsElapsed;

        // Don't exceed depreciable amount
        $maxDepreciation = $this->purchase_price - $this->salvage_value;
        return min($accumulatedDepreciation, $maxDepreciation);
    }

    /**
     * Calculate net book value
     * Formula: Purchase Price - Accumulated Depreciation
     */
    public function calculateNetBookValue(): float
    {
        $accumulatedDepreciation = $this->calculateAccumulatedDepreciation();
        $netBookValue = $this->purchase_price - $accumulatedDepreciation;

        return max($this->salvage_value, $netBookValue);
    }

    /**
     * Update depreciation values
     */
    public function updateDepreciation(): void
    {
        $this->accumulated_depreciation = $this->calculateAccumulatedDepreciation();
        $this->net_book_value = $this->calculateNetBookValue();
        $this->save();
    }

    /**
     * Get remaining useful life in years
     */
    public function getRemainingLifeAttribute(): int
    {
        if ($this->status !== 'active') {
            return 0;
        }

        $yearsElapsed = $this->purchase_date->diffInYears(now());
        $remainingLife = $this->useful_life - $yearsElapsed;

        return max(0, $remainingLife);
    }

    /**
     * Get depreciation progress percentage
     */
    public function getDepreciationProgressAttribute(): float
    {
        if ($this->depreciation_method === 'none') {
            return 0;
        }

        $maxDepreciation = $this->purchase_price - $this->salvage_value;
        if ($maxDepreciation <= 0) {
            return 0;
        }

        $progress = ($this->accumulated_depreciation / $maxDepreciation) * 100;
        return min(100, max(0, $progress));
    }

    /**
     * Check if asset is fully depreciated
     */
    public function isFullyDepreciated(): bool
    {
        return $this->net_book_value <= $this->salvage_value || $this->remaining_life <= 0;
    }

    /**
     * Get status badge color
     */
    public function getStatusBadgeAttribute(): string
    {
        return match ($this->status) {
            'active' => $this->isFullyDepreciated() ? 'gray' : 'green',
            'sold' => 'blue',
            'disposed' => 'yellow',
            'scrapped' => 'orange',
            'lost' => 'red',
            default => 'gray',
        };
    }

    /**
     * Get status label
     */
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => $this->isFullyDepreciated() ? 'Fully Depreciated' : 'Active',
            'sold' => 'Sold',
            'disposed' => 'Disposed',
            'scrapped' => 'Scrapped',
            'lost' => 'Lost',
            default => 'Unknown',
        };
    }

    /**
     * Get depreciation method label
     */
    public function getDepreciationMethodLabelAttribute(): string
    {
        return match ($this->depreciation_method) {
            'straight_line' => 'Straight Line',
            'declining_balance' => 'Declining Balance',
            'units_of_production' => 'Units of Production',
            'none' => 'No Depreciation',
            default => 'Unknown',
        };
    }

    /**
     * Generate unique asset code
     */
    public static function generateAssetCode(): string
    {
        $prefix = 'AST';
        $lastAsset = self::withTrashed()->orderBy('id', 'desc')->first();

        if (!$lastAsset) {
            return $prefix . '-0001';
        }

        $lastCode = $lastAsset->asset_code;
        $lastNumber = intval(str_replace($prefix . '-', '', $lastCode));
        $newNumber = $lastNumber + 1;

        return $prefix . '-' . str_pad($newNumber, 4, '0', STR_PAD_LEFT);
    }

    /**
     * Get depreciation schedule (year by year breakdown)
     */
    public function getDepreciationScheduleAttribute(): array
    {
        if ($this->depreciation_method === 'none') {
            return [];
        }

        $schedule = [];
        $bookValue = $this->purchase_price;
        $accumulatedDepreciation = 0;

        for ($year = 1; $year <= $this->useful_life; $year++) {
            $yearDepreciation = match ($this->depreciation_method) {
                'straight_line' => ($this->purchase_price - $this->salvage_value) / $this->useful_life,
                'declining_balance' => $bookValue * ($this->depreciation_rate / 100),
                'units_of_production' => ($this->purchase_price - $this->salvage_value) / $this->useful_life,
                default => 0,
            };

            // Ensure we don't depreciate below salvage value
            if ($this->depreciation_method === 'declining_balance') {
                $maxDepreciation = $bookValue - $this->salvage_value;
                $yearDepreciation = min($yearDepreciation, $maxDepreciation);
            }

            $accumulatedDepreciation += $yearDepreciation;
            $bookValue -= $yearDepreciation;

            $schedule[] = [
                'year' => $year,
                'depreciation' => max(0, round($yearDepreciation, 2)),
                'accumulated' => max(0, round($accumulatedDepreciation, 2)),
                'book_value' => max($this->salvage_value, round($bookValue, 2)),
            ];

            if ($bookValue <= $this->salvage_value) {
                break;
            }
        }

        return $schedule;
    }
}
