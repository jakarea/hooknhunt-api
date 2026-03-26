<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Wallet extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'balance',
        'total_credited',
        'total_debited',
        'is_active',
        'is_frozen',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'balance' => 'decimal:2',
        'total_credited' => 'decimal:2',
        'total_debited' => 'decimal:2',
        'is_active' => 'boolean',
        'is_frozen' => 'boolean',
    ];

    /**
     * Get the user that owns the wallet.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all transactions for the wallet.
     */
    public function transactions(): HasMany
    {
        return $this->hasMany(WalletTransaction::class);
    }

    /**
     * Credit amount to wallet
     */
    public function credit(float $amount, string $sourceType, ?int $sourceId, string $description, ?int $createdBy = null): WalletTransaction
    {
        return \DB::transaction(function () use ($amount, $sourceType, $sourceId, $description, $createdBy) {
            $balanceBefore = $this->balance;
            $balanceAfter = $balanceBefore + $amount;

            // Update wallet
            $this->update([
                'balance' => $balanceAfter,
                'total_credited' => $this->total_credited + $amount,
            ]);

            // Create transaction
            return $this->transactions()->create([
                'type' => 'credit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'description' => $description,
                'created_by' => $createdBy,
            ]);
        });
    }

    /**
     * Debit amount from wallet
     */
    public function debit(float $amount, string $sourceType, ?int $sourceId, string $description, ?int $createdBy = null): WalletTransaction
    {
        if ($this->balance < $amount) {
            throw new \Exception('Insufficient wallet balance');
        }

        return \DB::transaction(function () use ($amount, $sourceType, $sourceId, $description, $createdBy) {
            $balanceBefore = $this->balance;
            $balanceAfter = $balanceBefore - $amount;

            // Update wallet
            $this->update([
                'balance' => $balanceAfter,
                'total_debited' => $this->total_debited + $amount,
            ]);

            // Create transaction
            return $this->transactions()->create([
                'type' => 'debit',
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'source_type' => $sourceType,
                'source_id' => $sourceId,
                'description' => $description,
                'created_by' => $createdBy,
            ]);
        });
    }

    /**
     * Check if wallet has sufficient balance
     */
    public function hasSufficientBalance(float $amount): bool
    {
        return $this->balance >= $amount;
    }

    /**
     * Scope to get active wallets
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)->where('is_frozen', false);
    }
}
