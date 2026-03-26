<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\ChartOfAccount;
use App\Models\Bank;
use App\Models\BankTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ExpenseController extends Controller
{
    use ApiResponse;

    /**
     * 1. Create Expense Request
     */
    public function store(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.expenses.create')) {
            return $this->sendError('You do not have permission to create expenses.', null, 403);
        }

        $request->validate([
            'title' => 'required|string',
            'amount' => 'required|numeric|min:1',
            'account_id' => 'required|exists:chart_of_accounts,id', // Expense Head
            'payment_account_id' => 'nullable|exists:chart_of_accounts,id', // Payment From (Bank/Cash)
            'expense_date' => 'required|date',
            // VAT and Tax fields - optional
            'vat_percentage' => 'nullable|numeric|min:0|max:100',
            'vat_amount' => 'nullable|numeric|min:0',
            'vat_challan_no' => 'nullable|string|max:255',
            'tax_percentage' => 'nullable|numeric|min:0|max:100',
            'tax_amount' => 'nullable|numeric|min:0',
            'tax_challan_no' => 'nullable|string|max:255',
        ]);

        $expense = Expense::create([
            'title' => $request->title,
            'amount' => $request->amount,
            'expense_date' => $request->expense_date,
            'account_id' => $request->account_id,
            'payment_account_id' => $request->payment_account_id,
            'paid_by' => auth()->id(),
            'is_approved' => false,
            // VAT and Tax fields
            'vat_percentage' => $request->vat_percentage,
            'vat_amount' => $request->vat_amount,
            'vat_challan_no' => $request->vat_challan_no,
            'tax_percentage' => $request->tax_percentage,
            'tax_amount' => $request->tax_amount,
            'tax_challan_no' => $request->tax_challan_no,
        ]);

        return $this->sendSuccess($expense->load(['account', 'paymentAccount']), 'Expense submitted for approval.');
    }

    /**
     * 2. List All Expenses (with filters)
     * GET /api/v2/finance/expenses
     */
    public function index(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.expenses.view')) {
            return $this->sendError('You do not have permission to view expenses.', null, 403);
        }

        // Load source relationship to identify payroll expenses
        $query = Expense::with(['account', 'paymentAccount', 'user', 'source']);

        // Filter by account
        if ($request->has('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        // Filter by approval status
        if ($request->has('is_approved')) {
            $query->where('is_approved', $request->boolean('is_approved'));
        }

        // Filter by user who paid
        if ($request->has('paid_by')) {
            $query->where('paid_by', $request->paid_by);
        }

        // Search by title, reference_number, or notes
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        // Date range filter
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('expense_date', [$request->start_date, $request->end_date]);
        }

        // Order by latest first
        $expenses = $query->orderBy('expense_date', 'desc')
                       ->orderBy('created_at', 'desc')
                       ->paginate($request->per_page ?? 15);

        return $this->sendSuccess($expenses, 'Expenses retrieved successfully.');
    }

    /**
     * 3. Get Single Expense by ID
     * GET /api/v2/finance/expenses/{id}
     */
    public function show($id)
    {
        if (!auth()->user()->hasPermissionTo('finance.expenses.view')) {
            return $this->sendError('You do not have permission to view expenses.', null, 403);
        }

        $expense = Expense::with(['account', 'paymentAccount', 'user'])->findOrFail($id);
        return $this->sendSuccess($expense, 'Expense retrieved successfully.');
    }

    /**
     * 4. Update Expense
     * PUT/PATCH /api/v2/finance/expenses/{id}
     */
    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('finance.expenses.edit')) {
            return $this->sendError('You do not have permission to edit expenses.', null, 403);
        }

        $request->validate([
            'title' => 'sometimes|required|string',
            'amount' => 'sometimes|numeric|min:1',
            'account_id' => 'sometimes|exists:chart_of_accounts,id',
            'payment_account_id' => 'sometimes|nullable|exists:chart_of_accounts,id',
            'expense_date' => 'sometimes|date',
            'reference_number' => 'sometimes|nullable|string',
            'notes' => 'sometimes|nullable|string',
            'attachment' => 'sometimes|nullable|string',
            // VAT and Tax fields - optional
            'vat_percentage' => 'sometimes|nullable|numeric|min:0|max:100',
            'vat_amount' => 'sometimes|nullable|numeric|min:0',
            'vat_challan_no' => 'sometimes|nullable|string|max:255',
            'tax_percentage' => 'sometimes|nullable|numeric|min:0|max:100',
            'tax_amount' => 'sometimes|nullable|numeric|min:0',
            'tax_challan_no' => 'sometimes|nullable|string|max:255',
        ]);

        $expense = Expense::findOrFail($id);

        // Prevent modification if already approved (journal entries already posted)
        if ($expense->is_approved) {
            return $this->sendError('Cannot modify approved expenses. Ledger entries already posted.');
        }

        // Update only provided fields
        $updateData = $request->only([
            'title',
            'amount',
            'account_id',
            'payment_account_id',
            'expense_date',
            'reference_number',
            'notes',
            'attachment',
            // VAT and Tax fields
            'vat_percentage',
            'vat_amount',
            'vat_challan_no',
            'tax_percentage',
            'tax_amount',
            'tax_challan_no',
        ]);

        $expense->update($updateData);

        return $this->sendSuccess($expense->load(['account', 'paymentAccount', 'user']), 'Expense updated successfully.');
    }

    /**
     * 5. Delete Expense
     * DELETE /api/v2/finance/expenses/{id}
     */
    public function destroy($id)
    {
        if (!auth()->user()->hasPermissionTo('finance.expenses.delete')) {
            return $this->sendError('You do not have permission to delete expenses.', null, 403);
        }

        $expense = Expense::findOrFail($id);

        // Prevent deletion if already approved (protects ledger entries)
        if ($expense->is_approved) {
            return $this->sendError('Cannot delete approved expenses. Ledger entries already posted.');
        }

        // Delete the expense (only if not approved)
        $expense->delete();

        return $this->sendSuccess(null, 'Expense deleted successfully.');
    }

    /**
     * 6. Approve Expense & Post to Journal
     */
    public function approve(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('finance.expenses.approve')) {
            return $this->sendError('You do not have permission to approve expenses.', null, 403);
        }

        $expense = Expense::with(['account', 'paymentAccount'])->findOrFail($id);

        if ($expense->is_approved) {
            return $this->sendError('Already approved');
        }

        DB::beginTransaction();
        try {
            // Check if this is a procurement expense (wallet payment from supplier credit)
            $isProcurementWalletExpense =
                $expense->reference_type === PurchaseOrder::class &&
                $expense->payment_account_id === null;

            // Handle supplier wallet deduction for procurement expenses
            if ($isProcurementWalletExpense) {
                $po = PurchaseOrder::find($expense->reference_id);
                if ($po && $po->supplier) {
                    // Deduct from supplier wallet
                    $note = "Payment for PO {$po->po_number} - Expense approved";
                    $po->supplier->debitWallet($expense->amount, $note);

                    // Create supplier ledger entry
                    SupplierLedger::create([
                        'supplier_id' => $po->supplier->id,
                        'type' => 'payment',
                        'amount' => $expense->amount,
                        'balance' => $po->supplier->wallet_balance,
                        'transaction_id' => $po->po_number,
                        'reason' => $note,
                    ]);
                }
            }

            // Get payment account - use selected one or find default (only for bank payments)
            $paymentAccount = $expense->paymentAccount;

            if (!$isProcurementWalletExpense && !$paymentAccount) {
                // Fall back to finding a cash/bank account (for backward compatibility)
                $paymentAccount = ChartOfAccount::where('type', 'asset')
                    ->where('is_active', true)
                    ->where(function ($query) {
                        $query->where('name', 'like', '%Cash%')
                              ->orWhere('name', 'like', '%Bank%')
                              ->orWhere('name', 'like', '%bKash%')
                              ->orWhere('code', 'like', 'BANK%');
                    })
                    ->first();

                if (!$paymentAccount) {
                    return $this->sendError(
                        'Payment account not configured. Please select a payment account or create a Cash/Bank account.',
                        null,
                        400
                    );
                }
            }

            // A. Mark as Approved
            $expense->update(['is_approved' => true]);

            // B. Create Journal Entry (Double Entry) - only if there's a payment account
            $journalEntryId = null;
            if ($paymentAccount) {
                $je = JournalEntry::create([
                    'entry_number' => 'EXP-' . time(),
                    'date' => $expense->expense_date,
                    'description' => $expense->title,
                    'reference_type' => Expense::class,
                    'reference_id' => $expense->id,
                    'created_by' => auth()->id()
                ]);

                // Debit: Expense Account (e.g., Accounts Payable for PO)
                JournalItem::create([
                    'journal_entry_id' => $je->id,
                    'account_id' => $expense->account_id,
                    'debit' => $expense->amount,
                    'credit' => 0
                ]);

                // Credit: Payment Account (e.g., Cash, Bank)
                JournalItem::create([
                    'journal_entry_id' => $je->id,
                    'account_id' => $paymentAccount->id,
                    'debit' => 0,
                    'credit' => $expense->amount
                ]);

                $journalEntryId = $je->id;

                // C. Create Bank Transaction (if we can find a matching bank)
                $this->createBankTransactionForExpense($expense, $paymentAccount, $journalEntryId);

                // D. Validate balance (critical for double-entry)
                if (!$je->isBalanced()) {
                    DB::rollBack();
                    return $this->sendError(
                        'Journal entry is not balanced. Debit: ' . $je->getTotalDebitAttribute . ', Credit: ' . $je->getTotalCreditAttribute,
                        null,
                        500
                    );
                }
            }

            DB::commit();
            return $this->sendSuccess(null, 'Expense approved and posted to Ledger.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Approval failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * Create bank transaction for expense approval
     */
    private function createBankTransactionForExpense(Expense $expense, ChartOfAccount $paymentAccount, int $journalEntryId): void
    {
        // First, try to find a bank linked directly to this chart of account
        $bank = Bank::where('chart_of_account_id', $paymentAccount->id)->first();

        // If no direct link, try to find by name (backward compatibility)
        if (!$bank) {
            $bank = Bank::where('status', 'active')
                ->where(function ($query) use ($paymentAccount) {
                    $query->where('name', $paymentAccount->name)
                          ->orWhere('name', 'like', '%' . $paymentAccount->name . '%');
                })
                ->first();
        }

        if ($bank) {
            // Get current balance before transaction
            $balanceBefore = $bank->current_balance;
            $balanceAfter = $balanceBefore - $expense->amount;

            // Check for overdraft warning (but still allow the transaction)
            // Overdraft limit can be configured as a negative threshold
            $overdraftLimit = -100000; // Default: allow up to 100,000 negative balance

            if ($balanceAfter < $overdraftLimit) {
                // Throw exception if overdraft would exceed limit
                throw new \Exception('Insufficient balance. This expense would exceed the overdraft limit.');
            }

            // Create bank transaction
            BankTransaction::create([
                'bank_id' => $bank->id,
                'type' => 'withdrawal',
                'amount' => $expense->amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => $expense->reference_number,
                'description' => 'Expense: ' . $expense->title,
                'transaction_date' => $expense->expense_date,
                'transactionable_type' => Expense::class,
                'transactionable_id' => $expense->id,
                'journal_entry_id' => $journalEntryId,
                'created_by' => auth()->id(),
            ]);

            // Update bank balance
            $bank->update(['current_balance' => $balanceAfter]);
        }
        // If no matching bank found, skip bank transaction creation
        // The journal entry is still created for proper accounting
    }
}