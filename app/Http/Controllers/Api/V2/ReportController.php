<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\JournalItem;
use App\Models\ChartOfAccount;
use App\Models\Bank;
use App\Models\BankTransaction;
use App\Models\DailyFinancialReport;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    use ApiResponse;

    /**
     * 1. Profit & Loss Statement (Income - Expense)
     */
    public function profitLoss(Request $request)
    {
        // Date Fix: Ensure full day coverage
        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->startOfDay()
            : Carbon::now()->startOfMonth();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->endOfDay()
            : Carbon::now()->endOfDay();

        // Calculate Total Income (Credit balance of 'income' type accounts)
        $income = JournalItem::whereHas('account', fn($q) => $q->where('type', 'income'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(DB::raw('credit - debit'));

        // Calculate Total Expense (Debit balance of 'expense' type accounts)
        $expense = JournalItem::whereHas('account', fn($q) => $q->where('type', 'expense'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(DB::raw('debit - credit'));

        $netProfit = $income - $expense;

        // Get detailed breakdown by account
        $incomeAccounts = ChartOfAccount::where('type', 'income')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate]);
            }])
            ->get()
            ->map(function($account) {
                $debit = $account->journalItems->sum('debit');
                $credit = $account->journalItems->sum('credit');
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'code' => $account->code,
                    'debit' => (float) $debit,
                    'credit' => (float) $credit,
                    'net' => (float) ($credit - $debit),
                ];
            })
            ->filter(function($item) {
                return $item['net'] != 0;
            })
            ->values();

        $expenseAccounts = ChartOfAccount::where('type', 'expense')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($startDate, $endDate) {
                $q->whereBetween('created_at', [$startDate, $endDate]);
            }])
            ->get()
            ->map(function($account) {
                $debit = $account->journalItems->sum('debit');
                $credit = $account->journalItems->sum('credit');
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'code' => $account->code,
                    'debit' => (float) $debit,
                    'credit' => (float) $credit,
                    'net' => (float) ($debit - $credit),
                ];
            })
            ->filter(function($item) {
                return $item['net'] != 0;
            })
            ->values();

        return $this->sendSuccess([
            'date_range' => $startDate->format('Y-m-d') . " to " . $endDate->format('Y-m-d'),
            'total_income' => (float) $income,
            'total_expense' => (float) $expense,
            'net_profit' => (float) $netProfit,
            'status' => $netProfit >= 0 ? 'Profit' : 'Loss',
            'income_breakdown' => $incomeAccounts,
            'expense_breakdown' => $expenseAccounts,
        ]);
    }

    /**
     * 2. Balance Sheet (Assets, Liabilities, Equity)
     * Formula: Assets = Liabilities + Equity
     */
    public function balanceSheet(Request $request)
    {
        $asOfDate = $request->as_of_date
            ? Carbon::parse($request->as_of_date)->endOfDay()
            : Carbon::now()->endOfDay();

        // Calculate Assets (Debit balance)
        $assetAccounts = ChartOfAccount::where('type', 'asset')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($asOfDate) {
                $q->where('created_at', '<=', $asOfDate);
            }])
            ->get()
            ->map(function($account) {
                $debit = $account->journalItems->sum('debit');
                $credit = $account->journalItems->sum('credit');
                $balance = $debit - $credit;
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'code' => $account->code,
                    'debit' => (float) $debit,
                    'credit' => (float) $credit,
                    'balance' => (float) $balance,
                ];
            })
            ->filter(function($item) {
                return $item['balance'] != 0;
            })
            ->values();

        $totalAssets = $assetAccounts->sum('balance');

        // Calculate Liabilities (Credit balance)
        $liabilityAccounts = ChartOfAccount::where('type', 'liability')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($asOfDate) {
                $q->where('created_at', '<=', $asOfDate);
            }])
            ->get()
            ->map(function($account) {
                $debit = $account->journalItems->sum('debit');
                $credit = $account->journalItems->sum('credit');
                $balance = $credit - $debit;
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'code' => $account->code,
                    'debit' => (float) $debit,
                    'credit' => (float) $credit,
                    'balance' => (float) $balance,
                ];
            })
            ->filter(function($item) {
                return $item['balance'] != 0;
            })
            ->values();

        $totalLiabilities = $liabilityAccounts->sum('balance');

        // Calculate Equity (Credit balance)
        $equityAccounts = ChartOfAccount::where('type', 'equity')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($asOfDate) {
                $q->where('created_at', '<=', $asOfDate);
            }])
            ->get()
            ->map(function($account) {
                $debit = $account->journalItems->sum('debit');
                $credit = $account->journalItems->sum('credit');
                $balance = $credit - $debit;
                return [
                    'id' => $account->id,
                    'name' => $account->name,
                    'code' => $account->code,
                    'debit' => (float) $debit,
                    'credit' => (float) $credit,
                    'balance' => (float) $balance,
                ];
            })
            ->filter(function($item) {
                return $item['balance'] != 0;
            })
            ->values();

        $totalEquity = $equityAccounts->sum('balance');

        // Calculate accumulated profit/loss (Income - Expense up to date)
        $accumulatedProfit = JournalItem::whereHas('account', fn($q) => $q->whereIn('type', ['income', 'expense']))
            ->where('created_at', '<=', $asOfDate)
            ->get()
            ->reduce(function($carry, $item) {
                if ($item->account->type === 'income') {
                    return $carry + ($item->credit - $item->debit);
                } else {
                    return $carry - ($item->debit - $item->credit);
                }
            }, 0);

        $totalEquityWithRetained = $totalEquity + $accumulatedProfit;

        return $this->sendSuccess([
            'as_of_date' => $asOfDate->format('Y-m-d'),
            'assets' => [
                'accounts' => $assetAccounts,
                'total' => (float) $totalAssets,
            ],
            'liabilities' => [
                'accounts' => $liabilityAccounts,
                'total' => (float) $totalLiabilities,
            ],
            'equity' => [
                'accounts' => $equityAccounts,
                'total' => (float) $totalEquity,
                'accumulated_profit_loss' => (float) $accumulatedProfit,
                'total_with_retained' => (float) $totalEquityWithRetained,
            ],
            'total_liabilities_and_equity' => (float) ($totalLiabilities + $totalEquityWithRetained),
            'is_balanced' => abs($totalAssets - ($totalLiabilities + $totalEquityWithRetained)) < 0.01,
        ]);
    }

    /**
     * 3. Cash Flow Statement
     * Shows cash movement from operating, investing, and financing activities
     */
    public function cashFlow(Request $request)
    {
        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->startOfDay()
            : Carbon::now()->startOfMonth();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->endOfDay()
            : Carbon::now()->endOfDay();

        // Get cash accounts from Banks table and Chart of Accounts
        $cashBankIds = Bank::active()
            ->whereIn('type', ['cash', 'bank', 'bkash', 'nagad', 'rocket'])
            ->pluck('id')
            ->toArray();

        // Operating Activities: Revenue and Expense transactions
        $operatingInflow = JournalItem::whereHas('account', fn($q) => $q->where('type', 'income'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(DB::raw('credit - debit'));

        $operatingOutflow = JournalItem::whereHas('account', fn($q) => $q->whereIn('type', ['expense']))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(DB::raw('debit - credit'));

        $netOperatingCashFlow = $operatingInflow - $operatingOutflow;

        // Get bank transactions for actual cash movement
        $bankTransactions = BankTransaction::whereBetween('transaction_date', [$startDate->format('Y-m-d'), $endDate->format('Y-m-d')])
            ->get()
            ->groupBy('type');

        $cashDeposits = $bankTransactions->get('deposit', collect())->sum('amount');
        $cashWithdrawals = $bankTransactions->get('withdrawal', collect())->sum('amount');
        $transfersIn = $bankTransactions->get('transfer_in', collect())->sum('amount');
        $transfersOut = $bankTransactions->get('transfer_out', collect())->sum('amount');

        // Current cash balance
        $currentCashBalance = Bank::active()->sum('current_balance');

        // Beginning cash balance
        $beginningCashBalance = Bank::where('created_at', '<', $startDate)
            ->sum('current_balance');

        // Calculate net change in cash
        $netChangeInCash = $currentCashBalance - $beginningCashBalance;

        return $this->sendSuccess([
            'period' => $startDate->format('Y-m-d') . " to " . $endDate->format('Y-m-d'),
            'operating_activities' => [
                'cash_inflow' => (float) $operatingInflow,
                'cash_outflow' => (float) $operatingOutflow,
                'net_cash_flow' => (float) $netOperatingCashFlow,
            ],
            'bank_transactions' => [
                'deposits' => (float) $cashDeposits,
                'withdrawals' => (float) $cashWithdrawals,
                'transfers_in' => (float) $transfersIn,
                'transfers_out' => (float) $transfersOut,
                'net_transfers' => (float) ($transfersIn - $transfersOut),
            ],
            'cash_position' => [
                'beginning_balance' => (float) $beginningCashBalance,
                'ending_balance' => (float) $currentCashBalance,
                'net_change' => (float) $netChangeInCash,
            ],
        ]);
    }

    /**
     * 4. Trial Balance
     * Lists all accounts with their debit/credit balances
     */
    public function trialBalance(Request $request)
    {
        $asOfDate = $request->as_of_date
            ? Carbon::parse($request->as_of_date)->endOfDay()
            : Carbon::now()->endOfDay();

        $accounts = ChartOfAccount::where('is_active', true)
            ->with(['journalItems' => function($q) use ($asOfDate) {
                $q->where('created_at', '<=', $asOfDate);
            }])
            ->get()
            ->map(function($account) {
                $debit = $account->journalItems->sum('debit');
                $credit = $account->journalItems->sum('credit');

                // Calculate balance based on account type
                if (in_array($account->type, ['asset', 'expense'])) {
                    $balance = $debit - $credit;
                } else {
                    $balance = $credit - $debit;
                }

                return [
                    'id' => $account->id,
                    'code' => $account->code,
                    'name' => $account->name,
                    'type' => $account->type,
                    'debit' => (float) $debit,
                    'credit' => (float) $credit,
                    'balance' => (float) $balance,
                    'balance_type' => $balance >= 0 ? 'debit' : 'credit',
                ];
            })
            ->filter(function($item) {
                return $item['debit'] > 0 || $item['credit'] > 0;
            })
            ->sortBy('code')
            ->values();

        $totalDebit = $accounts->sum('debit');
        $totalCredit = $accounts->sum('credit');

        return $this->sendSuccess([
            'as_of_date' => $asOfDate->format('Y-m-d'),
            'accounts' => $accounts,
            'totals' => [
                'debit' => (float) $totalDebit,
                'credit' => (float) $totalCredit,
                'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
            ],
        ]);
    }

    /**
     * 5. General Ledger
     * Detailed transaction history for all accounts
     */
    public function generalLedger(Request $request)
    {
        $request->validate([
            'account_id' => 'nullable|exists:chart_of_accounts,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
        ]);

        $startDate = $request->start_date
            ? Carbon::parse($request->start_date)->startOfDay()
            : Carbon::now()->startOfMonth();

        $endDate = $request->end_date
            ? Carbon::parse($request->end_date)->endOfDay()
            : Carbon::now()->endOfDay();

        $query = JournalItem::with(['account', 'journalEntry', 'journalEntry.createdBy'])
            ->whereBetween('created_at', [$startDate, $endDate]);

        if ($request->has('account_id')) {
            $query->where('account_id', $request->account_id);
        }

        $journalItems = $query->orderBy('created_at')
            ->paginate(200);

        return $this->sendSuccess($journalItems, 'General ledger retrieved successfully.');
    }
}