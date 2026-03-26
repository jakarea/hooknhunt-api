<?php

namespace App\Console\Commands;

use App\Models\DailyFinancialReport;
use App\Models\Bank;
use App\Models\JournalItem;
use App\Models\JournalEntry;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class GenerateDailyFinancialReport extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'finance:daily-report {--date= : Generate report for specific date (YYYY-MM-DD)} {--force : Force regenerate even if report exists}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate daily financial report automatically at 6:00 AM';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'))->startOfDay()
            : Carbon::yesterday()->startOfDay();

        $force = $this->option('force');

        $this->info("Generating daily financial report for: " . $date->format('Y-m-d'));

        // Check if report already exists
        $existingReport = DailyFinancialReport::where('report_date', $date->format('Y-m-d'))->first();

        if ($existingReport && !$force) {
            $this->info("Report already exists for this date. Use --force to regenerate.");
            return 0;
        }

        if ($existingReport && $force) {
            $this->info("Force regenerating report...");
            $existingReport->delete();
        }

        DB::beginTransaction();
        try {
            // Calculate revenue for the day
            $totalRevenue = JournalItem::whereHas('account', function($q) {
                    $q->where('type', 'income');
                })
                ->whereHas('journalEntry', function($q) use ($date) {
                    $q->whereBetween('date', [$date->copy()->startOfDay(), $date->copy()->endOfDay()]);
                })
                ->sum(DB::raw('credit - debit'));

            // Calculate expenses for the day
            $totalExpenses = JournalItem::whereHas('account', function($q) {
                    $q->where('type', 'expense');
                })
                ->whereHas('journalEntry', function($q) use ($date) {
                    $q->whereBetween('date', [$date->copy()->startOfDay(), $date->copy()->endOfDay()]);
                })
                ->sum(DB::raw('debit - credit'));

            $netProfit = $totalRevenue - $totalExpenses;

            // Get bank balances
            $cashBalance = Bank::where('type', 'cash')->where('status', 'active')->sum('current_balance');
            $bankBalance = Bank::where('type', 'bank')->where('status', 'active')->sum('current_balance');
            $mobileWalletBalance = Bank::whereIn('type', ['bkash', 'nagad', 'rocket'])
                                        ->where('status', 'active')
                                        ->sum('current_balance');

            // Calculate total assets (all asset accounts)
            $totalAssets = JournalItem::whereHas('account', function($q) {
                    $q->where('type', 'asset');
                })
                ->whereHas('journalEntry', function($q) use ($date) {
                    $q->where('journal_entries.date', '<=', $date->format('Y-m-d'));
                })
                ->get()
                ->reduce(function($carry, $item) {
                    return $carry + ($item->debit - $item->credit);
                }, 0);

            // Calculate total liabilities
            $totalLiabilities = JournalItem::whereHas('account', function($q) {
                    $q->where('type', 'liability');
                })
                ->whereHas('journalEntry', function($q) use ($date) {
                    $q->where('journal_entries.date', '<=', $date->format('Y-m-d'));
                })
                ->get()
                ->reduce(function($carry, $item) {
                    return $carry + ($item->credit - $item->debit);
                }, 0);

            // Calculate equity
            $equity = JournalItem::whereHas('account', function($q) {
                    $q->where('type', 'equity');
                })
                ->whereHas('journalEntry', function($q) use ($date) {
                    $q->where('journal_entries.date', '<=', $date->format('Y-m-d'));
                })
                ->get()
                ->reduce(function($carry, $item) {
                    return $carry + ($item->credit - $item->debit);
                }, 0);

            // Count transactions for the day
            $transactionsCount = JournalEntry::whereBetween('date', [$date->copy()->startOfDay(), $date->copy()->endOfDay()])->count();

            // Prepare detailed report data
            $reportData = [
                'revenue_breakdown' => $this->getRevenueBreakdown($date),
                'expense_breakdown' => $this->getExpenseBreakdown($date),
                'bank_balances' => $this->getBankBalances(),
                'profit_margin' => $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 2) : 0,
            ];

            // Create the daily report
            $report = DailyFinancialReport::create([
                'report_date' => $date->format('Y-m-d'),
                'total_revenue' => $totalRevenue,
                'total_expenses' => $totalExpenses,
                'net_profit' => $netProfit,
                'cash_balance' => $cashBalance,
                'bank_balance' => $bankBalance,
                'mobile_wallet_balance' => $mobileWalletBalance,
                'total_assets' => max(0, $totalAssets),
                'total_liabilities' => max(0, $totalLiabilities),
                'equity' => $equity,
                'transactions_count' => $transactionsCount,
                'is_auto_generated' => true,
                'report_data' => $reportData,
                'generated_by' => null, // System generated
            ]);

            DB::commit();

            $this->info("✅ Daily financial report generated successfully!");
            $this->table(
                ['Metric', 'Amount (BDT)'],
                [
                    ['Total Revenue', number_format($totalRevenue, 2)],
                    ['Total Expenses', number_format($totalExpenses, 2)],
                    ['Net Profit/Loss', number_format($netProfit, 2)],
                    ['Cash Balance', number_format($cashBalance, 2)],
                    ['Bank Balance', number_format($bankBalance, 2)],
                    ['Mobile Wallet Balance', number_format($mobileWalletBalance, 2)],
                    ['Total Assets', number_format(max(0, $totalAssets), 2)],
                    ['Total Liabilities', number_format(max(0, $totalLiabilities), 2)],
                    ['Equity', number_format($equity, 2)],
                    ['Transactions Count', $transactionsCount],
                ]
            );

            return 0;

        } catch (\Exception $e) {
            DB::rollBack();
            $this->error("❌ Failed to generate daily financial report: " . $e->getMessage());
            return 1;
        }
    }

    /**
     * Get revenue breakdown by account
     */
    private function getRevenueBreakdown($date)
    {
        return \App\Models\ChartOfAccount::where('type', 'income')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($date) {
                $q->whereHas('journalEntry', function($jq) use ($date) {
                    $jq->whereBetween('date', [$date->copy()->startOfDay(), $date->copy()->endOfDay()]);
                });
            }])
            ->get()
            ->map(function($account) {
                $net = $account->journalItems->sum('credit') - $account->journalItems->sum('debit');
                return [
                    'account' => $account->name,
                    'amount' => (float) $net,
                ];
            })
            ->filter(function($item) {
                return $item['amount'] > 0;
            })
            ->values();
    }

    /**
     * Get expense breakdown by account
     */
    private function getExpenseBreakdown($date)
    {
        return \App\Models\ChartOfAccount::where('type', 'expense')
            ->where('is_active', true)
            ->with(['journalItems' => function($q) use ($date) {
                $q->whereHas('journalEntry', function($jq) use ($date) {
                    $jq->whereBetween('date', [$date->copy()->startOfDay(), $date->copy()->endOfDay()]);
                });
            }])
            ->get()
            ->map(function($account) {
                $net = $account->journalItems->sum('debit') - $account->journalItems->sum('credit');
                return [
                    'account' => $account->name,
                    'amount' => (float) $net,
                ];
            })
            ->filter(function($item) {
                return $item['amount'] > 0;
            })
            ->values();
    }

    /**
     * Get all bank balances
     */
    private function getBankBalances()
    {
        return Bank::active()
            ->select('type', 'name', 'current_balance')
            ->get()
            ->groupBy('type')
            ->map(function($item) {
                return [
                    'total' => (float) $item->sum('current_balance'),
                    'accounts' => $item->map(function($acc) {
                        return [
                            'name' => $acc->name,
                            'balance' => (float) $acc->current_balance,
                        ];
                    })->toArray(),
                ];
            })->toArray();
    }
}
