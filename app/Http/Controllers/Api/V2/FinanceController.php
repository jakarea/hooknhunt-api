<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Bank;
use App\Models\BankTransaction;
use App\Models\Expense;
use App\Models\ChartOfAccount;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FinanceController extends Controller
{
    use ApiResponse;

    /**
     * Finance Dashboard - Summary Statistics
     * GET /api/v2/finance/dashboard
     */
    public function dashboard(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('finance.dashboard.view')) {
            return $this->sendError('You do not have permission to view finance dashboard.', null, 403);
        }

        // Get date range (default to current month)
        $startDate = $request->start_date ?? now()->startOfMonth();
        $endDate = $request->end_date ?? now()->endOfMonth();

        // 1. Banks Summary by Type
        $banksByType = Bank::active()
            ->select('type', DB::raw('COUNT(*) as count'))
            ->selectRaw('SUM(current_balance) as total_balance')
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $banksSummary = [
            'cash' => [
                'count' => $banksByType->get('cash', (object)['count' => 0] ?? 0)->count ?? 0,
                'total_balance' => $banksByType->get('cash', (object)['total_balance' => 0] ?? 0)->total_balance ?? 0,
            ],
            'bank' => [
                'count' => $banksByType->get('bank', (object)['count' => 0] ?? 0)->count ?? 0,
                'total_balance' => $banksByType->get('bank', (object)['total_balance' => 0] ?? 0)->total_balance ?? 0,
            ],
            'bkash' => [
                'count' => $banksByType->get('bkash', (object)['count' => 0] ?? 0)->count ?? 0,
                'total_balance' => $banksByType->get('bkash', (object)['total_balance' => 0] ?? 0)->total_balance ?? 0,
            ],
            'nagad' => [
                'count' => $banksByType->get('nagad', (object)['count' => 0] ?? 0)->count ?? 0,
                'total_balance' => $banksByType->get('nagad', (object)['total_balance' => 0] ?? 0)->total_balance ?? 0,
            ],
            'rocket' => [
                'count' => $banksByType->get('rocket', (object)['count' => 0] ?? 0)->count ?? 0,
                'total_balance' => $banksByType->get('rocket', (object)['total_balance' => 0] ?? 0)->total_balance ?? 0,
            ],
        ];

        $totalBanks = $banksByType->sum('total_balance') ?? 0;
        $totalBankAccounts = Bank::active()->count();

        // 2. Recent Transactions (last 5)
        $recentTransactions = BankTransaction::with(['bank', 'createdBy'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        // 3. Pending Expenses
        $pendingExpensesCount = Expense::pending()->count();
        $pendingExpensesAmount = Expense::pending()->sum('amount');

        // 4. Revenue vs Expenses (for current month)
        // Revenue from 'income' type accounts
        $revenue = \App\Models\JournalItem::whereHas('account', fn($q) => $q->where('type', 'income'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(DB::raw('credit - debit'));

        // Expenses from 'expense' type accounts
        $expenses = \App\Models\JournalItem::whereHas('account', fn($q) => $q->where('type', 'expense'))
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum(DB::raw('debit - credit'));

        $netIncome = $revenue - $expenses;

        // 5. Build dashboard response
        $dashboard = [
            'banks_summary' => [
                'total_balance' => $totalBanks,
                'account_count' => $totalBankAccounts,
                'by_type' => $banksSummary,
            ],
            'recent_transactions' => $recentTransactions,
            'expenses' => [
                'pending_count' => $pendingExpensesCount,
                'pending_amount' => $pendingExpensesAmount,
            ],
            'revenue_vs_expenses' => [
                'revenue' => $revenue,
                'expenses' => $expenses,
                'net_income' => $netIncome,
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
            ],
        ];

        return $this->sendSuccess($dashboard, 'Finance dashboard data retrieved successfully.');
    }
}
