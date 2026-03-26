<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'wallet_balance' => 'decimal:2',
        'credit_limit' => 'decimal:2',
    ];

    // Future Relation: Shipments
    public function shipments()
    {
        return $this->hasMany(Shipment::class);
    }

    /**
     * Add credit to supplier wallet (refund for lost items)
     */
    public function addCredit(float $amount, ?string $note): bool
    {
        $this->wallet_balance += $amount;
        $saved = $this->save();

        if ($saved && $note) {
            $this->addWalletNote($note, $amount, 'credit');
        }

        return $saved;
    }

    /**
     * Debit from supplier wallet (when lost items are received later)
     */
    public function debitWallet(float $amount, ?string $note): bool
    {
        // Check if debit would exceed credit limit
        if (($this->wallet_balance - $amount) < -$this->credit_limit) {
            return false; // Would exceed credit limit
        }

        $this->wallet_balance -= $amount;
        $saved = $this->save();

        if ($saved && $note) {
            $this->addWalletNote($note, $amount, 'debit');
        }

        return $saved;
    }

    /**
     * Add note to wallet transaction history
     */
    protected function addWalletNote(string $note, float $amount, string $type): void
    {
        $notes = $this->wallet_notes ? json_decode($this->wallet_notes, true) : [];
        $notes[] = [
            'date' => now()->toDateTimeString(),
            'type' => $type, // 'credit' or 'debit'
            'amount' => $amount,
            'balance_after' => $this->wallet_balance,
            'note' => $note,
        ];
        $this->wallet_notes = json_encode($notes);
        $this->saveQuietly(); // Save without triggering events
    }

    /**
     * Get current wallet status
     */
    public function getWalletStatusAttribute(): string
    {
        if ($this->wallet_balance > 0) {
            return 'credit';
        } elseif ($this->wallet_balance < 0) {
            return 'debit';
        }
        return 'balanced';
    }

    /**
     * Check if supplier has sufficient credit for a debit operation
     */
    public function hasSufficientCreditForDebit(float $amount): bool
    {
        return ($this->wallet_balance - $amount) >= -$this->credit_limit;
    }
}
