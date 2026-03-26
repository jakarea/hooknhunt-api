<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use App\Models\JournalItem;
use App\Models\JournalEntry;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    /**
     * Get all chart of accounts
     */
    public function index(Request $request): JsonResponse
    {
        $query = ChartOfAccount::query();

        // Filter by account type
        if ($request->type) {
            $query->ofType($request->type);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by name, code, or description
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('code', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Order by type and code
        $query->orderByRaw("FIELD(type, 'asset', 'liability', 'equity', 'income', 'expense'), 'code'")
              ->orderBy('code');

        $accounts = $query->paginate($request->per_page ?? 50);

        // Calculate current balances for each account
        $accounts->getCollection()->transform(function ($account) {
            $account = $this->calculateAccountBalance($account);
            $account->type_label = $account->type_label;
            return $account;
        });

        return response()->json([
            'success' => true,
            'data' => $accounts,
        ]);
    }

    /**
     * Get single chart of account
     */
    public function show(int $id): JsonResponse
    {
        $account = ChartOfAccount::with(['journalItems.journalEntry'])->find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Calculate balance
        $account = $this->calculateAccountBalance($account);
        $account->type_label = $account->type_label;

        // Get recent journal entries for this account
        $recentEntries = JournalEntry::whereHas('items', function ($q) use ($id) {
            $q->where('account_id', $id);
        })
            ->with(['creator', 'items.account'])
            ->orderBy('date', 'desc')
            ->limit(20)
            ->get();

        // Get recent expenses for this account (if it's an expense account)
        $recentExpenses = [];
        if ($account->type === 'expense') {
            $recentExpenses = Expense::where('account_id', $id)
                ->with(['vendor', 'category', 'paymentMethod'])
                ->orderBy('date', 'desc')
                ->limit(10)
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => array_merge($account->toArray(), [
                'recent_entries' => $recentEntries,
                'recent_expenses' => $recentExpenses,
            ]),
        ]);
    }

    /**
     * Create new chart of account
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:chart_of_accounts,code',
            'type' => 'required|in:asset,liability,equity,income,expense',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $validated['is_active'] = $request->boolean('is_active', true);

        $account = ChartOfAccount::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Account created successfully',
            'data' => $account,
        ], 201);
    }

    /**
     * Update chart of account
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $account = ChartOfAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Check if account has journal entries
        $hasTransactions = $account->journalItems()->exists();
        if ($hasTransactions) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update account with existing journal entries. Create a new account instead.',
            ], 400);
        }

        // Check if account has expenses
        $hasExpenses = $account->expenses()->exists();
        if ($hasExpenses) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update account with existing expenses.',
            ], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'sometimes|string|max:50|unique:chart_of_accounts,code,' . $id,
            'type' => 'sometimes|in:asset,liability,equity,income,expense',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $account->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Account updated successfully',
            'data' => $account->fresh(),
        ]);
    }

    /**
     * Delete chart of account
     */
    public function destroy(int $id): JsonResponse
    {
        $account = ChartOfAccount::find($id);

        if (!$account) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found',
            ], 404);
        }

        // Check if account has journal entries
        $hasTransactions = $account->journalItems()->exists();
        if ($hasTransactions) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete account with existing journal entries.',
            ], 400);
        }

        // Check if account has expenses
        $hasExpenses = $account->expenses()->exists();
        if ($hasExpenses) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete account with existing expenses.',
            ], 400);
        }

        $account->delete();

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully',
        ]);
    }

    /**
     * Get balance summary
     */
    public function balanceSummary(): JsonResponse
    {
        // Get all accounts with their balances
        $accounts = ChartOfAccount::active()
            ->get()
            ->map(function ($account) {
                return $this->calculateAccountBalance($account);
            });

        // Calculate totals by type
        $totalsByType = [
            'asset' => $accounts->where('type', 'asset')->sum('balance'),
            'liability' => $accounts->where('type', 'liability')->sum('balance'),
            'equity' => $accounts->where('type', 'equity')->sum('balance'),
            'income' => $accounts->where('type', 'income')->sum('balance'),
            'expense' => $accounts->where('type', 'expense')->sum('balance'),
        ];

        // Calculate totals
        $totalAssets = $totalsByType['asset'];
        $totalLiabilities = $totalsByType['liability'];
        $totalEquity = $totalsByType['equity'];
        $totalRevenue = $totalsByType['income'];
        $totalExpenses = $totalsByType['expense'];

        // Accounting equation: Assets = Liabilities + Equity
        $calculatedEquity = $totalAssets - $totalLiabilities;

        // Net Income = Revenue - Expenses
        $netIncome = $totalRevenue - $totalExpenses;

        $summary = [
            'total_accounts' => $accounts->count(),
            'accounts_by_type' => [
                'asset' => $accounts->where('type', 'asset')->count(),
                'liability' => $accounts->where('type', 'liability')->count(),
                'equity' => $accounts->where('type', 'equity')->count(),
                'income' => $accounts->where('type', 'income')->count(),
                'expense' => $accounts->where('type', 'expense')->count(),
            ],
            'totals_by_type' => [
                [
                    'type' => 'asset',
                    'label' => 'Total Assets',
                    'amount' => $totalAssets,
                ],
                [
                    'type' => 'liability',
                    'label' => 'Total Liabilities',
                    'amount' => $totalLiabilities,
                ],
                [
                    'type' => 'equity',
                    'label' => 'Total Equity',
                    'amount' => $totalEquity,
                ],
                [
                    'type' => 'income',
                    'label' => 'Total Revenue',
                    'amount' => $totalRevenue,
                ],
                [
                    'type' => 'expense',
                    'label' => 'Total Expenses',
                    'amount' => $totalExpenses,
                ],
            ],
            'accounting_equation' => [
                'assets' => $totalAssets,
                'liabilities' => $totalLiabilities,
                'equity' => $totalEquity,
                'calculated_equity' => $calculatedEquity,
                'is_balanced' => abs($totalEquity - $calculatedEquity) < 0.01,
            ],
            'net_income' => $netIncome,
            'retained_earnings' => $netIncome,
            'cash_and_cash_equivalents' => $accounts->filter(function($acc) {
                return stripos(strtolower($acc->name), 'cash') !== false ||
                       stripos(strtolower($acc->name), 'bank') !== false;
            })->sum('balance'),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Get trial balance data
     */
    public function trialBalance(Request $request): JsonResponse
    {
        // Validate parameters (accepts both snake_case and camelCase from frontend)
        $asOfDate = $request->input('as_of_date') ?? $request->input('asOfDate') ?? now()->toDateString();
        $includeZeroBalance = $request->boolean('include_zero_balance', $request->boolean('includeZeroBalance', false));

        $query = ChartOfAccount::active();

        // Get all accounts with their balances up to the specified date
        $accounts = $query->get()->map(function ($account) use ($asOfDate) {
            // Calculate balance from journal items up to the specified date
            $debitTotal = JournalItem::where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('date', '<=', $asOfDate);
                })
                ->sum('debit');

            $creditTotal = JournalItem::where('account_id', $account->id)
                ->whereHas('journalEntry', function ($q) use ($asOfDate) {
                    $q->where('date', '<=', $asOfDate);
                })
                ->sum('credit');

            // Calculate balance based on account type
            if (in_array($account->type, ['asset', 'expense'])) {
                $balance = $debitTotal - $creditTotal;
            } else {
                $balance = $creditTotal - $debitTotal;
            }

            return [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'type' => $account->type,
                'type_label' => $account->type_label,
                'debit' => $debitTotal,
                'credit' => $creditTotal,
                'balance' => $balance,
            ];
        });

        // Filter out zero balance accounts if requested
        if (!$includeZeroBalance) {
            $accounts = $accounts->filter(function($acc) {
                return abs($acc['balance']) > 0.01;
            })->values(); // Reset keys to make it a proper array
        } else {
            $accounts = $accounts->values(); // Reset keys even without filtering
        }

        // Calculate totals
        $totalDebit = $accounts->sum('debit');
        $totalCredit = $accounts->sum('credit');
        $totalDebitBalances = $accounts->filter(function($acc) {
            return in_array($acc['type'], ['asset', 'expense']);
        })->sum('balance');
        $totalCreditBalances = $accounts->filter(function($acc) {
            return in_array($acc['type'], ['liability', 'equity', 'income']);
        })->sum('balance');

        $trialBalance = [
            'as_of_date' => $asOfDate,
            'accounts' => $accounts,
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'difference' => $totalDebit - $totalCredit,
            'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
            'total_debit_balances' => $totalDebitBalances,
            'total_credit_balances' => $totalCreditBalances,
        ];

        return response()->json([
            'success' => true,
            'data' => $trialBalance,
        ]);
    }

    /**
     * Get account statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = [
            'total_accounts' => ChartOfAccount::count(),
            'active_accounts' => ChartOfAccount::active()->count(),
            'inactive_accounts' => ChartOfAccount::where('is_active', false)->count(),
            'accounts_by_type' => [
                'asset' => ChartOfAccount::ofType('asset')->count(),
                'liability' => ChartOfAccount::ofType('liability')->count(),
                'equity' => ChartOfAccount::ofType('equity')->count(),
                'income' => ChartOfAccount::ofType('income')->count(),
                'expense' => ChartOfAccount::ofType('expense')->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Calculate account balance based on type
     */
    private function calculateAccountBalance(ChartOfAccount $account): ChartOfAccount
    {
        $debitTotal = $account->journalItems()->sum('debit');
        $creditTotal = $account->journalItems()->sum('credit');

        // Calculate balance based on account type
        if (in_array($account->type, ['asset', 'expense'])) {
            $account->balance = $debitTotal - $creditTotal;
        } else {
            $account->balance = $creditTotal - $debitTotal;
        }

        $account->debit_total = $debitTotal;
        $account->credit_total = $creditTotal;

        return $account;
    }
}
