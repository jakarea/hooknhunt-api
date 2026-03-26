<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Bank;
use App\Models\BankTransaction;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\ChartOfAccount;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BankController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of all bank accounts.
     *
     * GET /api/v2/finance/banks
     */
    public function index(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.view')) {
            return $this->sendError('You do not have permission to view bank accounts.', null, 403);
        }

        $query = Bank::with(['createdBy', 'updatedBy', 'chartOfAccount'])->withCount('transactions');

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by name or account number
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('account_number', 'like', "%{$search}%");
            });
        }

        $banks = $query->orderBy('type')->orderBy('name')->get();

        return $this->sendSuccess($banks, 'Bank accounts retrieved successfully.');
    }

    /**
     * Store a newly created bank account.
     *
     * POST /api/v2/finance/banks
     */
    public function store(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.create')) {
            return $this->sendError('You do not have permission to create bank accounts.', null, 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'account_number' => 'nullable|string|max:255|unique:banks,account_number',
            'account_name' => 'nullable|string|max:255',
            'type' => 'required|in:cash,bank,bkash,nagad,rocket,other',
            'branch' => 'nullable|string|max:255',
            'initial_balance' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'chart_of_account_id' => 'nullable|exists:chart_of_accounts,id',
        ]);

        DB::beginTransaction();
        try {
            // Find or create chart of account for this bank
            $chartOfAccountId = $request->chart_of_account_id;

            if (!$chartOfAccountId) {
                // Check if bank name already exists as chart of account
                $existingAccount = ChartOfAccount::where('name', 'like', '%' . $request->name . '%')
                    ->where('type', 'asset')
                    ->first();

                if ($existingAccount) {
                    $chartOfAccountId = $existingAccount->id;
                } else {
                    // Auto-create chart of account with validation
                    // Generate a unique code based on account type
                    $prefix = match($request->type) {
                        'cash' => 'CASH',
                        'bank' => 'BANK',
                        'bkash' => 'BKASH',
                        'nagad' => 'NAGAD',
                        'rocket' => 'ROCKET',
                        default => 'OTHER',
                    };

                    // Find the next available number for this account type
                    $lastAccount = ChartOfAccount::where('code', 'like', $prefix . '%')
                        ->orderBy('code', 'desc')
                        ->first();

                    $nextNumber = $lastAccount
                        ? (int) str_replace($prefix, '', $lastAccount->code) + 1
                        : 1;

                    $code = $prefix . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);

                    $chartOfAccount = ChartOfAccount::create([
                        'code' => $code,
                        'name' => "{$request->type} - {$request->name}",
                        'type' => 'asset',
                        'is_active' => true,
                    ]);
                    $chartOfAccountId = $chartOfAccount->id;
                }
            }

            $bank = Bank::create([
                'name' => $request->name,
                'account_number' => $request->account_number,
                'account_name' => $request->account_name,
                'type' => $request->type,
                'branch' => $request->branch,
                'current_balance' => $request->initial_balance ?? 0,
                'phone' => $request->phone,
                'status' => 'active',
                'notes' => $request->notes,
                'chart_of_account_id' => $chartOfAccountId,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            // If initial balance provided, record as opening transaction
            if ($request->has('initial_balance') && $request->initial_balance > 0) {
                BankTransaction::create([
                    'bank_id' => $bank->id,
                    'type' => 'deposit',
                    'amount' => $request->initial_balance,
                    'balance_before' => 0,
                    'balance_after' => $request->initial_balance,
                    'description' => 'Opening balance',
                    'transaction_date' => now()->toDateString(),
                    'created_by' => auth()->id(),
                ]);

                // Create journal entry for opening balance
                $this->createJournalEntryForBankTransaction($bank, $request->initial_balance, 'deposit');
            }

            DB::commit();
            return $this->sendSuccess($bank->load('createdBy', 'chartOfAccount'), 'Bank account created successfully.', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create bank account.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified bank account.
     *
     * GET /api/v2/finance/banks/{id}
     */
    public function show($id)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.view')) {
            return $this->sendError('You do not have permission to view bank accounts.', null, 403);
        }

        $bank = Bank::with([
            'createdBy',
            'updatedBy',
            'chartOfAccount',
            'transactions' => function ($q) {
                $q->orderBy('transaction_date', 'desc')->orderBy('created_at', 'desc')->limit(50);
            },
            'transactions.createdBy',
            'transactions.journalEntry'
        ])->findOrFail($id);

        // Calculate totals
        $totalDeposits = $bank->deposits()->sum('amount');
        $totalWithdrawals = $bank->withdrawals()->sum('amount');

        $bank->total_deposits = $totalDeposits;
        $bank->total_withdrawals = $totalWithdrawals;
        $bank->net_flow = $totalDeposits - $totalWithdrawals;

        return $this->sendSuccess($bank, 'Bank account retrieved successfully.');
    }

    /**
     * Update the specified bank account.
     *
     * PUT/PATCH /api/v2/finance/banks/{id}
     */
    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.edit')) {
            return $this->sendError('You do not have permission to edit bank accounts.', null, 403);
        }

        $bank = Bank::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'account_number' => 'nullable|string|max:255|unique:banks,account_number,' . $bank->id,
            'account_name' => 'nullable|string|max:255',
            'type' => 'required|in:cash,bank,bkash,nagad,rocket,other',
            'branch' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:active,inactive',
            'chart_of_account_id' => 'nullable|exists:chart_of_accounts,id',
        ]);

        $bank->update([
            'name' => $request->name,
            'account_number' => $request->account_number,
            'account_name' => $request->account_name,
            'type' => $request->type,
            'branch' => $request->branch,
            'phone' => $request->phone,
            'notes' => $request->notes,
            'status' => $request->status ?? $bank->status,
            'chart_of_account_id' => $request->chart_of_account_id ?? $bank->chart_of_account_id,
            'updated_by' => auth()->id(),
        ]);

        return $this->sendSuccess($bank->load('createdBy', 'updatedBy'), 'Bank account updated successfully.');
    }

    /**
     * Remove the specified bank account (soft delete).
     *
     * DELETE /api/v2/finance/banks/{id}
     */
    public function destroy($id)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.delete')) {
            return $this->sendError('You do not have permission to delete bank accounts.', null, 403);
        }

        $bank = Bank::findOrFail($id);

        // Check if bank has transactions
        if ($bank->transactions()->count() > 0) {
            return $this->sendError('Cannot delete bank account with existing transactions.', null, 400);
        }

        $bank->delete();

        return $this->sendSuccess(null, 'Bank account deleted successfully.');
    }

    /**
     * Get bank account transactions.
     *
     * GET /api/v2/finance/banks/{id}/transactions
     */
    public function transactions(Request $request, $id)
    {
        $bank = Bank::findOrFail($id);

        $query = $bank->transactions()->with('createdBy', 'journalEntry');

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dateRange($request->start_date, $request->end_date);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
                             ->orderBy('created_at', 'desc')
                             ->paginate(50);

        return $this->sendSuccess($transactions, 'Bank transactions retrieved successfully.');
    }

    /**
     * Deposit funds to a bank account.
     *
     * POST /api/v2/finance/banks/{id}/deposit
     */
    public function deposit(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.deposit')) {
            return $this->sendError('You do not have permission to deposit funds.', null, 403);
        }

        $bank = Bank::findOrFail($id);

        if ($bank->status === 'inactive') {
            return $this->sendError('Cannot deposit to inactive account.', null, 400);
        }

        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $balanceBefore = $bank->current_balance;
            $balanceAfter = $balanceBefore + $request->amount;

            // Create bank transaction
            $transaction = BankTransaction::create([
                'bank_id' => $bank->id,
                'type' => 'deposit',
                'amount' => $request->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => $request->reference_number,
                'description' => $request->description ?? 'Deposit',
                'transaction_date' => $request->transaction_date,
                'created_by' => auth()->id(),
            ]);

            // Update bank balance
            $bank->update(['current_balance' => $balanceAfter]);

            // Create journal entry
            $journalEntry = $this->createJournalEntryForBankTransaction(
                $bank,
                $request->amount,
                'deposit',
                $request->description ?? 'Deposit',
                $request->transaction_date,
                $transaction
            );

            // Link journal entry to transaction
            $transaction->update(['journal_entry_id' => $journalEntry->id]);

            DB::commit();
            return $this->sendSuccess([
                'transaction' => $transaction->load('journalEntry'),
                'new_balance' => $balanceAfter
            ], 'Deposit recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to record deposit.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Withdraw funds from a bank account.
     *
     * POST /api/v2/finance/banks/{id}/withdraw
     */
    public function withdraw(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.withdraw')) {
            return $this->sendError('You do not have permission to withdraw funds.', null, 403);
        }

        $bank = Bank::findOrFail($id);

        if ($bank->status === 'inactive') {
            return $this->sendError('Cannot withdraw from inactive account.', null, 400);
        }

        $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
            'reference_number' => 'nullable|string',
            'account_id' => 'required|exists:chart_of_accounts,id', // Expense account to debit
        ]);

        // Allow overdraft - transaction will complete even if balance is insufficient
        // Resulting balance can be negative, user will adjust manually if needed

        DB::beginTransaction();
        try {
            $balanceBefore = $bank->current_balance;
            $balanceAfter = $balanceBefore - $request->amount;

            // Create bank transaction
            $transaction = BankTransaction::create([
                'bank_id' => $bank->id,
                'type' => 'withdrawal',
                'amount' => $request->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => $request->reference_number,
                'description' => $request->description ?? 'Withdrawal',
                'transaction_date' => $request->transaction_date,
                'created_by' => auth()->id(),
            ]);

            // Update bank balance
            $bank->update(['current_balance' => $balanceAfter]);

            // Create journal entry (debit expense account, credit bank account)
            $journalEntry = $this->createJournalEntryForWithdrawal(
                $bank,
                $request->amount,
                $request->account_id,
                $request->description ?? 'Withdrawal',
                $request->transaction_date,
                $transaction
            );

            // Link journal entry to transaction
            $transaction->update(['journal_entry_id' => $journalEntry->id]);

            DB::commit();
            return $this->sendSuccess([
                'transaction' => $transaction->load('journalEntry'),
                'new_balance' => $balanceAfter
            ], 'Withdrawal recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to record withdrawal.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Transfer funds between bank accounts.
     *
     * POST /api/v2/finance/banks/transfer
     */
    public function transfer(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.banks.transfer')) {
            return $this->sendError('You do not have permission to transfer funds.', null, 403);
        }

        $request->validate([
            'from_bank_id' => 'required|exists:banks,id',
            'to_bank_id' => 'required|exists:banks,id|different:from_bank_id',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'transaction_date' => 'required|date',
        ]);

        $fromBank = Bank::findOrFail($request->from_bank_id);
        $toBank = Bank::findOrFail($request->to_bank_id);

        if ($fromBank->status === 'inactive' || $toBank->status === 'inactive') {
            return $this->sendError('Cannot transfer to/from inactive accounts.', null, 400);
        }

        // Allow overdraft - transfer will complete even if source balance is insufficient
        // Resulting balance can be negative, user will adjust manually if needed

        DB::beginTransaction();
        try {
            // Withdraw from source
            $fromBalanceBefore = $fromBank->current_balance;
            $fromBalanceAfter = $fromBalanceBefore - $request->amount;

            $fromTransaction = BankTransaction::create([
                'bank_id' => $fromBank->id,
                'type' => 'transfer_out',
                'amount' => $request->amount,
                'balance_before' => $fromBalanceBefore,
                'balance_after' => $fromBalanceAfter,
                'description' => $request->description ?? "Transfer to {$toBank->name}",
                'transaction_date' => $request->transaction_date,
                'created_by' => auth()->id(),
            ]);

            $fromBank->update(['current_balance' => $fromBalanceAfter]);

            // Deposit to destination
            $toBalanceBefore = $toBank->current_balance;
            $toBalanceAfter = $toBalanceBefore + $request->amount;

            $toTransaction = BankTransaction::create([
                'bank_id' => $toBank->id,
                'type' => 'transfer_in',
                'amount' => $request->amount,
                'balance_before' => $toBalanceBefore,
                'balance_after' => $toBalanceAfter,
                'description' => $request->description ?? "Transfer from {$fromBank->name}",
                'transaction_date' => $request->transaction_date,
                'created_by' => auth()->id(),
            ]);

            $toBank->update(['current_balance' => $toBalanceAfter]);

            // Create journal entry for transfer
            $journalEntry = $this->createJournalEntryForTransfer(
                $fromBank,
                $toBank,
                $request->amount,
                $request->description ?? 'Fund Transfer',
                $request->transaction_date
            );

            // Link journal entries to transactions
            $fromTransaction->update(['journal_entry_id' => $journalEntry->id]);
            $toTransaction->update(['journal_entry_id' => $journalEntry->id]);

            DB::commit();
            return $this->sendSuccess([
                'from_transaction' => $fromTransaction,
                'to_transaction' => $toTransaction,
                'from_new_balance' => $fromBalanceAfter,
                'to_new_balance' => $toBalanceAfter,
            ], 'Transfer completed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to complete transfer.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get bank account summary for dashboard.
     *
     * GET /api/v2/finance/banks/summary
     */
    public function summary()
    {
        $banks = Bank::active()->get();

        $summary = [
            'total_cash' => $banks->where('type', 'cash')->sum('current_balance'),
            'total_bank' => $banks->where('type', 'bank')->sum('current_balance'),
            'total_bkash' => $banks->where('type', 'bkash')->sum('current_balance'),
            'total_nagad' => $banks->where('type', 'nagad')->sum('current_balance'),
            'total_rocket' => $banks->where('type', 'rocket')->sum('current_balance'),
            'total_balance' => $banks->sum('current_balance'),
            'account_count' => $banks->count(),
            'by_type' => $banks->groupBy('type')->map(function ($item) {
                return [
                    'count' => $item->count(),
                    'total_balance' => $item->sum('current_balance'),
                ];
            }),
        ];

        return $this->sendSuccess($summary, 'Bank summary retrieved successfully.');
    }

    /**
     * Create journal entry for bank deposit.
     */
    private function createJournalEntryForBankTransaction($bank, $amount, $type, $description = null, $date = null, $transaction = null)
    {
        $date = $date ?? now()->toDateString();
        $description = $description ?? "Deposit to {$bank->name}";

        // Find or get relevant accounts
        $bankAccount = ChartOfAccount::firstOrCreate(
            ['code' => strtoupper($bank->type) . '-' . $bank->id],
            [
                'name' => "{$bank->type_label} - {$bank->name}",
                'type' => 'asset',
                'is_active' => true,
            ]
        );

        // For deposit, debit bank account, credit cash/income account
        $journalEntry = JournalEntry::create([
            'entry_number' => 'BNK-' . time(),
            'date' => $date,
            'description' => $description,
            'reference_type' => BankTransaction::class,
            'reference_id' => $transaction?->id,
            'created_by' => auth()->id(),
        ]);

        // Debit: Bank Account (Asset increases)
        JournalItem::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $bankAccount->id,
            'debit' => $amount,
            'credit' => 0,
        ]);

        // Credit: Default cash or income account
        $defaultAccount = ChartOfAccount::where('type', 'asset')
            ->where('name', 'like', '%Cash%')
            ->where('is_active', true)
            ->first();

        if (!$defaultAccount) {
            // Try to find any active asset account as fallback
            $defaultAccount = ChartOfAccount::where('type', 'asset')
                ->where('is_active', true)
                ->first();
        }

        if (!$defaultAccount) {
            throw new \Exception('No active asset account found for journal entry. Please create an asset account first.');
        }

        JournalItem::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $defaultAccount->id,
            'debit' => 0,
            'credit' => $amount,
        ]);

        // Validate balance (critical for double-entry)
        if (!$journalEntry->isBalanced()) {
            throw new \Exception('Journal entry is not balanced. Debit: ' . $journalEntry->getTotalDebitAttribute . ', Credit: ' . $journalEntry->getTotalCreditAttribute);
        }

        return $journalEntry;
    }

    /**
     * Create journal entry for bank withdrawal.
     */
    private function createJournalEntryForWithdrawal($bank, $amount, $expenseAccountId, $description = null, $date = null, $transaction = null)
    {
        $date = $date ?? now()->toDateString();
        $description = $description ?? "Withdrawal from {$bank->name}";

        $bankAccount = ChartOfAccount::firstOrCreate(
            ['code' => strtoupper($bank->type) . '-' . $bank->id],
            [
                'name' => "{$bank->type_label} - {$bank->name}",
                'type' => 'asset',
                'is_active' => true,
            ]
        );

        $journalEntry = JournalEntry::create([
            'entry_number' => 'BNK-W-' . time(),
            'date' => $date,
            'description' => $description,
            'reference_type' => BankTransaction::class,
            'reference_id' => $transaction?->id,
            'created_by' => auth()->id(),
        ]);

        // Debit: Expense Account
        JournalItem::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $expenseAccountId,
            'debit' => $amount,
            'credit' => 0,
        ]);

        // Credit: Bank Account (Asset decreases)
        JournalItem::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $bankAccount->id,
            'debit' => 0,
            'credit' => $amount,
        ]);

        // Validate balance (critical for double-entry)
        if (!$journalEntry->isBalanced()) {
            throw new \Exception('Journal entry is not balanced. Debit: ' . $journalEntry->getTotalDebitAttribute . ', Credit: ' . $journalEntry->getTotalCreditAttribute);
        }

        return $journalEntry;
    }

    /**
     * Create journal entry for fund transfer.
     */
    private function createJournalEntryForTransfer($fromBank, $toBank, $amount, $description = null, $date = null)
    {
        $date = $date ?? now()->toDateString();
        $description = $description ?? "Transfer from {$fromBank->name} to {$toBank->name}";

        $fromBankAccount = ChartOfAccount::firstOrCreate(
            ['code' => strtoupper($fromBank->type) . '-' . $fromBank->id],
            [
                'name' => "{$fromBank->type_label} - {$fromBank->name}",
                'type' => 'asset',
                'is_active' => true,
            ]
        );

        $toBankAccount = ChartOfAccount::firstOrCreate(
            ['code' => strtoupper($toBank->type) . '-' . $toBank->id],
            [
                'name' => "{$toBank->type_label} - {$toBank->name}",
                'type' => 'asset',
                'is_active' => true,
            ]
        );

        $journalEntry = JournalEntry::create([
            'entry_number' => 'BNK-T-' . time(),
            'date' => $date,
            'description' => $description,
            'created_by' => auth()->id(),
        ]);

        // Debit: To Bank Account (Asset increases)
        JournalItem::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $toBankAccount->id,
            'debit' => $amount,
            'credit' => 0,
        ]);

        // Credit: From Bank Account (Asset decreases)
        JournalItem::create([
            'journal_entry_id' => $journalEntry->id,
            'account_id' => $fromBankAccount->id,
            'debit' => 0,
            'credit' => $amount,
        ]);

        // Validate balance (critical for double-entry)
        if (!$journalEntry->isBalanced()) {
            throw new \Exception('Journal entry is not balanced. Debit: ' . $journalEntry->getTotalDebitAttribute . ', Credit: ' . $journalEntry->getTotalCreditAttribute);
        }

        return $journalEntry;
    }

    /**
     * Get payment accounts (bank accounts linked to chart of accounts).
     * Used for expense payment account dropdown.
     *
     * GET /api/v2/finance/payment-accounts
     */
    public function getPaymentAccounts()
    {
        // Get all banks with their linked chart accounts
        $banks = Bank::with('chartOfAccount')
            ->where('status', 'active')
            ->whereNotNull('chart_of_account_id')
            ->get()
            ->map(function ($bank) {
                return [
                    'id' => $bank->chart_of_account_id,
                    'name' => $bank->chartOfAccount->name ?? $bank->name,
                    'code' => $bank->chartOfAccount->code ?? '',
                    'type' => 'asset',
                    'bank_id' => $bank->id,
                    'bank_name' => $bank->name,
                    'bank_type' => $bank->type,
                ];
            });

        return $this->sendSuccess($banks, 'Payment accounts retrieved successfully.');
    }
}
