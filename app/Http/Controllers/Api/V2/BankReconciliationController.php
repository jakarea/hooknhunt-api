<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Bank;
use App\Models\BankReconciliation;
use App\Models\BankTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BankReconciliationController extends Controller
{
    use ApiResponse;

    /**
     * Get all bank reconciliations
     * GET /api/v2/finance/bank-reconciliations
     */
    public function index(Request $request)
    {
        $query = BankReconciliation::with(['bank', 'creator', 'reconciler']);

        // Filter by bank
        if ($request->has('bank_id')) {
            $query->where('bank_id', $request->bank_id);
        }

        // Filter by status
        if ($request->has('is_reconciled')) {
            $query->where('is_reconciled', $request->boolean('is_reconciled'));
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('statement_date', [$request->start_date, $request->end_date]);
        }

        $reconciliations = $query->orderBy('statement_date', 'desc')
                              ->orderBy('created_at', 'desc')
                              ->paginate($request->per_page ?? 15);

        return $this->sendSuccess($reconciliations, 'Bank reconciliations retrieved successfully.');
    }

    /**
     * Get single reconciliation details
     * GET /api/v2/finance/bank-reconciliations/{id}
     */
    public function show($id)
    {
        $reconciliation = BankReconciliation::with([
            'bank',
            'creator',
            'reconciler',
            'reconciler:id,name,email'
        ])->findOrFail($id);

        // Add summary calculations
        $reconciliation->summary = $reconciliation->summary;

        return $this->sendSuccess($reconciliation, 'Bank reconciliation retrieved successfully.');
    }

    /**
     * Create a new bank reconciliation
     * POST /api/v2/finance/bank-reconciliations
     */
    public function store(Request $request)
    {
        $request->validate([
            'bank_id' => 'required|exists:banks,id',
            'statement_date' => 'required|date|unique:bank_reconciliations,statement_date,NULL,NULL,bank_id',
            'statement_number' => 'nullable|string|max:255',
            'opening_balance' => 'required|numeric|min:0',
            'closing_balance' => 'required|numeric|min:0',
            'deposits_in_transit' => 'nullable|numeric|min:0',
            'outstanding_checks' => 'nullable|numeric|min:0',
            'bank_charges' => 'nullable|numeric|min:0',
            'interest_earned' => 'nullable|numeric|min:0',
            'other_adjustments' => 'nullable|numeric',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Get current book balance from system
            $bank = Bank::findOrFail($request->bank_id);
            $bookBalance = $bank->current_balance;

            // Create reconciliation
            $reconciliation = BankReconciliation::create([
                'bank_id' => $request->bank_id,
                'statement_date' => $request->statement_date,
                'statement_number' => $request->statement_number,
                'opening_balance' => $request->opening_balance,
                'closing_balance' => $request->closing_balance,
                'book_balance' => $bookBalance,
                'deposits_in_transit' => $request->deposits_in_transit ?? 0,
                'outstanding_checks' => $request->outstanding_checks ?? 0,
                'bank_charges' => $request->bank_charges ?? 0,
                'interest_earned' => $request->interest_earned ?? 0,
                'other_adjustments' => $request->other_adjustments ?? 0,
                'is_reconciled' => false,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            // Calculate and save adjusted balance and difference
            $reconciliation->adjusted_balance = $reconciliation->calculateAdjustedBalance();
            $reconciliation->difference = $reconciliation->calculateDifference();
            $reconciliation->save();

            DB::commit();
            return $this->sendSuccess($reconciliation->load('bank'), 'Bank reconciliation created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create reconciliation.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Update bank reconciliation
     * PUT/PATCH /api/v2/finance/bank-reconciliations/{id}
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'statement_number' => 'nullable|string|max:255',
            'opening_balance' => 'sometimes|numeric|min:0',
            'closing_balance' => 'sometimes|numeric|min:0',
            'deposits_in_transit' => 'nullable|numeric|min:0',
            'outstanding_checks' => 'nullable|numeric|min:0',
            'bank_charges' => 'nullable|numeric|min:0',
            'interest_earned' => 'nullable|numeric|min:0',
            'other_adjustments' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'attachment' => 'nullable|string',
        ]);

        $reconciliation = BankReconciliation::findOrFail($id);

        // Prevent modification if already reconciled
        if ($reconciliation->is_reconciled) {
            return $this->sendError('Cannot modify a reconciled statement. Reset reconciliation first.', null, 400);
        }

        DB::beginTransaction();
        try {
            // Update only provided fields
            $reconciliation->update($request->only([
                'statement_number',
                'opening_balance',
                'closing_balance',
                'deposits_in_transit',
                'outstanding_checks',
                'bank_charges',
                'interest_earned',
                'other_adjustments',
                'notes',
                'attachment',
            ]));

            // Recalculate adjusted balance and difference
            $reconciliation->adjusted_balance = $reconciliation->calculateAdjustedBalance();
            $reconciliation->difference = $reconciliation->calculateDifference();
            $reconciliation->updated_by = auth()->id();
            $reconciliation->save();

            DB::commit();
            return $this->sendSuccess($reconciliation->load('bank'), 'Bank reconciliation updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update reconciliation.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Delete bank reconciliation
     * DELETE /api/v2/finance/bank-reconciliations/{id}
     */
    public function destroy($id)
    {
        $reconciliation = BankReconciliation::findOrFail($id);

        // Prevent deletion if reconciled
        if ($reconciliation->is_reconciled) {
            return $this->sendError('Cannot delete a reconciled statement. Reset reconciliation first.', null, 400);
        }

        $reconciliation->delete();

        return $this->sendSuccess(null, 'Bank reconciliation deleted successfully.');
    }

    /**
     * Mark reconciliation as complete
     * POST /api/v2/finance/bank-reconciliations/{id}/reconcile
     */
    public function reconcile(Request $request, $id)
    {
        $reconciliation = BankReconciliation::findOrFail($id);

        // Check if balances match
        if (!$reconciliation->isBalanced()) {
            return $this->sendError(
                'Cannot reconcile. Balances do not match.',
                [
                    'adjusted_balance' => (float) $reconciliation->calculateAdjustedBalance(),
                    'closing_balance' => (float) $reconciliation->closing_balance,
                    'difference' => (float) $reconciliation->calculateDifference(),
                ],
                400
            );
        }

        DB::beginTransaction();
        try {
            $reconciliation->markAsReconciled();

            DB::commit();
            return $this->sendSuccess($reconciliation->load('bank'), 'Bank reconciled successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to reconcile.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Reset reconciliation
     * POST /api/v2/finance/bank-reconciliations/{id}/reset
     */
    public function reset($id)
    {
        $reconciliation = BankReconciliation::findOrFail($id);

        $reconciliation->resetReconciliation();

        return $this->sendSuccess($reconciliation->load('bank'), 'Reconciliation reset successfully.');
    }

    /**
     * Get auto-calculated book balance for a bank
     * GET /api/v2/finance/bank-reconciliations/book-balance/{bankId}
     */
    public function getBookBalance($bankId)
    {
        $bank = Bank::findOrFail($bankId);

        return $this->sendSuccess([
            'bank_id' => $bank->id,
            'bank_name' => $bank->name,
            'book_balance' => (float) $bank->current_balance,
        ], 'Book balance retrieved successfully.');
    }

    /**
     * Get pending transactions for reconciliation
     * GET /api/v2/finance/bank-reconciliations/pending-transactions/{bankId}
     */
    public function getPendingTransactions(Request $request, $bankId)
    {
        $bank = Bank::findOrFail($bankId);
        $statementDate = $request->query('statement_date');

        // Get all transactions up to statement date
        $query = BankTransaction::where('bank_id', $bankId)
            ->where('transaction_date', '<=', $statementDate ?? now()->toDateString());

        $transactions = $query->orderBy('transaction_date', 'desc')
                         ->orderBy('created_at', 'desc')
                         ->get();

        return $this->sendSuccess($transactions, 'Pending transactions retrieved successfully.');
    }

    /**
     * Get reconciliation summary
     * GET /api/v2/finance/bank-reconciliations/summary
     */
    public function summary(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $query = BankReconciliation::query();

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('statement_date', [$request->start_date, $request->end_date]);
        }

        $total = $query->count();
        $reconciled = (clone $query)->reconciled()->count();
        $pending = $total - $reconciled;

        // Calculate total differences
        $reconciliations = $query->get();
        $totalDifference = $reconciliations->sum('difference');

        return $this->sendSuccess([
            'total' => $total,
            'reconciled' => $reconciled,
            'pending' => $pending,
            'total_difference' => (float) $totalDifference,
            'has_discrepancies' => abs($totalDifference) > 0.01,
        ], 'Reconciliation summary retrieved successfully.');
    }
}
