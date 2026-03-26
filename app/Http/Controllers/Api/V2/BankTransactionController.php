<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\BankTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class BankTransactionController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of all bank transactions.
     *
     * GET /api/v2/finance/bank-transactions
     */
    public function index(Request $request)
    {
        $query = BankTransaction::with(['bank', 'createdBy', 'journalEntry', 'transactionable']);

        // Filter by bank
        if ($request->has('bank_id')) {
            $query->where('bank_id', $request->bank_id);
        }

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
                             ->orderBy('created_at', 'desc')
                             ->paginate(100);

        return $this->sendSuccess($transactions, 'Bank transactions retrieved successfully.');
    }

    /**
     * Display the specified transaction.
     *
     * GET /api/v2/finance/bank-transactions/{id}
     */
    public function show($id)
    {
        $transaction = BankTransaction::with([
            'bank',
            'createdBy',
            'journalEntry',
            'journalEntry.items',
            'journalEntry.items.account',
            'transactionable'
        ])->findOrFail($id);

        return $this->sendSuccess($transaction, 'Transaction retrieved successfully.');
    }

    /**
     * Get transaction statistics.
     *
     * GET /api/v2/finance/bank-transactions/statistics
     */
    public function statistics(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'bank_id' => 'nullable|exists:banks,id',
        ]);

        $query = BankTransaction::query();

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        if ($request->has('bank_id')) {
            $query->where('bank_id', $request->bank_id);
        }

        $totalDeposits = (clone $query)->ofType('deposit')->sum('amount');
        $totalWithdrawals = (clone $query)->ofType('withdrawal')->sum('amount');
        $totalTransferIn = (clone $query)->ofType('transfer_in')->sum('amount');
        $totalTransferOut = (clone $query)->ofType('transfer_out')->sum('amount');

        $statistics = [
            'total_deposits' => $totalDeposits,
            'total_withdrawals' => $totalWithdrawals,
            'total_transfer_in' => $totalTransferIn,
            'total_transfer_out' => $totalTransferOut,
            'total_inflow' => $totalDeposits + $totalTransferIn,
            'total_outflow' => $totalWithdrawals + $totalTransferOut,
            'net_flow' => ($totalDeposits + $totalTransferIn) - ($totalWithdrawals + $totalTransferOut),
            'transaction_count' => $query->count(),
            'by_type' => [
                'deposit' => $totalDeposits,
                'withdrawal' => $totalWithdrawals,
                'transfer_in' => $totalTransferIn,
                'transfer_out' => $totalTransferOut,
            ],
        ];

        return $this->sendSuccess($statistics, 'Transaction statistics retrieved successfully.');
    }

    /**
     * Create a new bank transaction
     * POST /api/v2/finance/bank-transactions
     */
    public function store(Request $request)
    {
        $request->validate([
            'bank_id' => 'required|exists:banks,id',
            'type' => 'required|in:deposit,withdrawal,transfer_in,transfer_out',
            'amount' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'description' => 'required|string',
            'reference_number' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        // Find the bank and update balance (in real app, this should be wrapped in a transaction)
        $bank = \App\Models\Bank::findOrFail($request->bank_id);

        DB::beginTransaction();
        try {
            // Create transaction
            $transaction = \App\Models\BankTransaction::create([
                'bank_id' => $request->bank_id,
                'type' => $request->type,
                'amount' => $request->amount,
                'transaction_date' => $request->transaction_date,
                'description' => $request->description,
                'reference_number' => $request->reference_number,
                'notes' => $request->notes,
                'balance_after' => 0, // Will be calculated
                'created_by' => auth()->id(),
            ]);

            // Update bank balance based on transaction type
            if ($request->type === 'deposit' || $request->type === 'transfer_in') {
                $bank->current_balance += $request->amount;
            } elseif ($request->type === 'withdrawal' || $request->type === 'transfer_out') {
                $bank->current_balance -= $request->amount;
            }

            // Update balance_after in transaction
            $transaction->balance_after = $bank->current_balance;
            $transaction->save();
            $bank->save();

            DB::commit();
            return $this->sendSuccess($transaction->load('bank'), 'Transaction created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Transaction failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Update a bank transaction
     * PUT/PATCH /api/v2/finance/bank-transactions/{id}
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'transaction_date' => 'sometimes|date',
            'description' => 'sometimes|string',
            'reference_number' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
        ]);

        $transaction = \App\Models\BankTransaction::findOrFail($id);

        // Prevent modification if journal entry exists
        if ($transaction->journal_entry_id) {
            return $this->sendError('Cannot update transaction that has been posted to ledger.');
        }

        // Only update non-financial fields (amount, type, bank_id cannot be changed)
        $transaction->update($request->only([
            'transaction_date',
            'description',
            'reference_number',
            'notes',
        ]));

        return $this->sendSuccess($transaction->load('bank'), 'Transaction updated successfully.');
    }

    /**
     * Delete a bank transaction
     * DELETE /api/v2/finance/bank-transactions/{id}
     */
    public function destroy($id)
    {
        $transaction = \App\Models\BankTransaction::findOrFail($id);

        // Prevent deletion if journal entry exists
        if ($transaction->journal_entry_id) {
            return $this->sendError('Cannot delete transaction that has been posted to ledger.');
        }

        // Reverse the effect on bank balance (wrap in transaction in real app)
        $bank = $transaction->bank;

        DB::beginTransaction();
        try {
            // Reverse balance change
            if ($transaction->type === 'deposit' || $transaction->type === 'transfer_in') {
                $bank->current_balance -= $transaction->amount;
            } elseif ($transaction->type === 'withdrawal' || $transaction->type === 'transfer_out') {
                $bank->current_balance += $transaction->amount;
            }

            // Delete transaction
            $transaction->delete();
            $bank->save();

            DB::commit();
            return $this->sendSuccess(null, 'Transaction deleted successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Delete failed', ['error' => $e->getMessage()]);
        }
    }
}
