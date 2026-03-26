<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\BankTransaction;
use App\Models\Expense;
use App\Models\Bank;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of all financial transactions (bank + expenses).
     *
     * GET /api/v2/finance/transactions
     */
    public function index(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.transactions.index')) {
            return $this->sendError('You do not have permission to view transactions.', null, 403);
        }

        // Get filters
        $bankId = $request->input('bank_id');
        $type = $request->input('type'); // all, bank, expense, deposit, withdrawal, transfer_in, transfer_out
        $search = $request->input('search');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $perPage = $request->input('per_page', 50);

        $transactions = collect();

        // 1. Get Bank Transactions (with type filter if needed)
        $bankQuery = BankTransaction::with(['bank', 'createdBy', 'transactionable']);

        // Filter bank transactions by bank
        if ($bankId) {
            $bankQuery->where('bank_id', $bankId);
        }

        // Filter bank transactions by type
        if ($type && in_array($type, ['deposit', 'withdrawal', 'transfer_in', 'transfer_out'])) {
            $bankQuery->ofType($type);
        }

        // Date range filter for bank transactions
        if ($startDate && $endDate) {
            $bankQuery->dateRange($startDate, $endDate);
        } elseif ($startDate) {
            $bankQuery->where('transaction_date', '>=', $startDate);
        } elseif ($endDate) {
            $bankQuery->where('transaction_date', '<=', $endDate);
        }

        // Search for bank transactions
        if ($search) {
            $bankQuery->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        $bankTransactions = $bankQuery->orderBy('transaction_date', 'desc')
                                      ->orderBy('created_at', 'desc')
                                      ->get();

        // Transform bank transactions to unified format
        foreach ($bankTransactions as $bt) {
            $dateString = null;
            if ($bt->transaction_date) {
                try {
                    $dateString = $bt->transaction_date->format('Y-m-d');
                } catch (\Exception $e) {
                    // Fallback to created_at if transaction_date fails
                    $dateString = $bt->created_at ? $bt->created_at->format('Y-m-d') : null;
                }
            }

            $transactions->push([
                'id' => 'bt_' . $bt->id,
                'transaction_type' => 'bank_transaction',
                'type' => $bt->type,
                'transaction_date' => $dateString,
                'description' => $bt->description,
                'reference_number' => $bt->reference_number,
                'amount' => (float) $bt->amount,
                'balance_before' => (float) ($bt->balance_before ?? 0),
                'balance_after' => (float) ($bt->balance_after ?? 0),
                'bank' => $bt->bank ? [
                    'id' => $bt->bank->id,
                    'name' => $bt->bank->name,
                ] : null,
                'created_by' => $bt->createdBy ? [
                    'id' => $bt->createdBy->id,
                    'name' => $bt->createdBy->name,
                ] : null,
                'transactionable_type' => $bt->transactionable_type,
                'transactionable_id' => $bt->transactionable_id,
                'created_at' => $bt->created_at ? $bt->created_at->toISOString() : null,
            ]);
        }

        // 2. Get Expenses (only if not filtering to bank-only types)
        if (!$type || $type === 'all' || $type === 'expense') {
            $expenseQuery = Expense::with(['account', 'paymentAccount', 'user'])
                ->where('is_approved', true); // Only approved expenses affect transactions

            // Only include expenses with payment account (cash/bank)
            $expenseQuery->whereNotNull('payment_account_id');

            // Filter expenses by payment account (if bank_id filter is provided)
            // We need to match the chart_of_account_id with the bank's linked chart account
            if ($bankId) {
                $bank = Bank::find($bankId);
                if ($bank && $bank->chart_of_account_id) {
                    $expenseQuery->where('payment_account_id', $bank->chart_of_account_id);
                }
            }

            // Date range filter for expenses
            if ($startDate && $endDate) {
                $expenseQuery->whereBetween('expense_date', [$startDate, $endDate]);
            } elseif ($startDate) {
                $expenseQuery->where('expense_date', '>=', $startDate);
            } elseif ($endDate) {
                $expenseQuery->where('expense_date', '<=', $endDate);
            }

            // Search for expenses
            if ($search) {
                $expenseQuery->where(function ($q) use ($search) {
                    $q->where('title', 'like', "%{$search}%")
                      ->orWhere('reference_number', 'like', "%{$search}%")
                      ->orWhere('notes', 'like', "%{$search}%");
                });
            }

            $expenses = $expenseQuery->orderBy('expense_date', 'desc')
                                    ->orderBy('created_at', 'desc')
                                    ->get();

            // Transform expenses to unified format
            foreach ($expenses as $expense) {
                // Check if this expense already has a bank transaction
                $hasBankTransaction = $bankTransactions->contains(function ($bt) use ($expense) {
                    return $bt->transactionable_type === Expense::class
                        && $bt->transactionable_id == $expense->id;
                });

                // Only add expense if it doesn't have a bank transaction
                // (to avoid duplicates when expense creates a bank transaction on approval)
                if (!$hasBankTransaction) {
                    // Get bank info from payment account
                    $bankInfo = null;
                    if ($expense->paymentAccount) {
                        $bankInfo = [
                            'id' => $expense->paymentAccount->id,
                            'name' => $expense->paymentAccount->name,
                        ];
                    }

                    $dateString = null;
                    if ($expense->expense_date) {
                        try {
                            $dateString = $expense->expense_date->format('Y-m-d');
                        } catch (\Exception $e) {
                            // Fallback to created_at if expense_date fails
                            $dateString = $expense->created_at ? $expense->created_at->format('Y-m-d') : null;
                        }
                    }

                    $transactions->push([
                        'id' => 'exp_' . $expense->id,
                        'transaction_type' => 'expense',
                        'type' => 'expense',
                        'transaction_date' => $dateString,
                        'description' => $expense->title,
                        'reference_number' => $expense->reference_number,
                        'amount' => (float) $expense->amount,
                        'balance_before' => null, // Expenses don't track balance
                        'balance_after' => null,
                        'bank' => $bankInfo,
                        'created_by' => $expense->user ? [
                            'id' => $expense->user->id,
                            'name' => $expense->user->name,
                        ] : null,
                        'transactionable_type' => Expense::class,
                        'transactionable_id' => $expense->id,
                        'created_at' => $expense->created_at->toISOString(),
                        'expense_data' => [
                            'account' => $expense->account ? [
                                'id' => $expense->account->id,
                                'name' => $expense->account->name,
                            ] : null,
                            'vat_amount' => (float) ($expense->vat_amount ?? 0),
                            'tax_amount' => (float) ($expense->tax_amount ?? 0),
                        ],
                    ]);
                }
            }
        }

        // Sort all transactions by created_at (newest first)
        $transactions = $transactions->sortByDesc(function ($item) {
            // Use created_at as primary sort
            if (isset($item['created_at'])) {
                return $item['created_at'];
            }
            // Fallback to transaction_date if created_at is not set
            return !empty($item['transaction_date']) ? $item['transaction_date'] : '1970-01-01';
        })->values();

        // Paginate
        $currentPage = $request->input('page', 1);
        $total = $transactions->count();
        $paginatedTransactions = $transactions->slice(($currentPage - 1) * $perPage, $perPage)->values();

        return $this->sendSuccess([
            'transactions' => $paginatedTransactions,
            'meta' => [
                'current_page' => (int) $currentPage,
                'per_page' => (int) $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
            ],
        ], 'Transactions retrieved successfully.');
    }

    /**
     * Get unified transaction statistics.
     *
     * GET /api/v2/finance/transactions/statistics
     */
    public function statistics(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.transactions.index')) {
            return $this->sendError('You do not have permission to view transaction statistics.', null, 403);
        }

        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $bankId = $request->input('bank_id');

        // Bank Transaction Statistics
        $bankQuery = BankTransaction::query();

        if ($startDate && $endDate) {
            $bankQuery->dateRange($startDate, $endDate);
        }
        if ($bankId) {
            $bankQuery->where('bank_id', $bankId);
        }

        $totalDeposits = (clone $bankQuery)->ofType('deposit')->sum('amount');
        $totalWithdrawals = (clone $bankQuery)->ofType('withdrawal')->sum('amount');
        $totalTransferIn = (clone $bankQuery)->ofType('transfer_in')->sum('amount');
        $totalTransferOut = (clone $bankQuery)->ofType('transfer_out')->sum('amount');
        $bankTransactionCount = $bankQuery->count();

        // Expense Statistics (only approved with payment account)
        $expenseQuery = Expense::where('is_approved', true)
            ->whereNotNull('payment_account_id');

        if ($startDate && $endDate) {
            $expenseQuery->whereBetween('expense_date', [$startDate, $endDate]);
        }
        if ($bankId) {
            $bank = Bank::find($bankId);
            if ($bank && $bank->chart_of_account_id) {
                $expenseQuery->where('payment_account_id', $bank->chart_of_account_id);
            }
        }

        $totalExpenses = $expenseQuery->sum('amount');
        $expenseCount = $expenseQuery->count();

        // Calculate totals
        $totalInflow = $totalDeposits + $totalTransferIn;
        $totalOutflow = $totalWithdrawals + $totalTransferOut + $totalExpenses;
        $netFlow = $totalInflow - $totalOutflow;
        $totalTransactions = $bankTransactionCount + $expenseCount;

        $statistics = [
            'total_inflow' => (float) $totalInflow,
            'total_outflow' => (float) $totalOutflow,
            'net_flow' => (float) $netFlow,
            'transaction_count' => $totalTransactions,
            'bank_transactions_count' => $bankTransactionCount,
            'expenses_count' => $expenseCount,
            'breakdown' => [
                'deposits' => (float) $totalDeposits,
                'withdrawals' => (float) $totalWithdrawals,
                'transfers_in' => (float) $totalTransferIn,
                'transfers_out' => (float) $totalTransferOut,
                'expenses' => (float) $totalExpenses,
            ],
        ];

        return $this->sendSuccess($statistics, 'Transaction statistics retrieved successfully.');
    }
}
