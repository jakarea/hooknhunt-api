<?php

namespace App\Services;

use App\Models\FinancialReport;
use App\Models\ChartOfAccount;
use App\Models\BankTransaction;
use App\Models\Expense;
use App\Services\CurrencyService;
use Illuminate\Support\Facades\DB;

class FinancialReportService
{
    protected CurrencyService $currencyService;

    public function __construct(CurrencyService $currencyService)
    {
        $this->currencyService = $currencyService;
    }

    /**
     * Generate comparative financial statement (year-over-year)
     */
    public function generateComparativeReport(FinancialReport $report): array
    {
        $config = $report->config;
        $currentStart = $report->start_date;
        $currentEnd = $report->end_date;
        $previousStart = $report->compare_start_date;
        $previousEnd = $report->compare_end_date;

        // Get account balances for current period
        $currentPeriod = $this->getAccountBalances($currentStart, $currentEnd);

        // Get account balances for previous period
        $previousPeriod = $this->getAccountBalances($previousStart, $previousEnd);

        // Calculate changes
        $data = [];
        foreach ($currentPeriod as $accountId => $current) {
            $previous = $previousPeriod[$accountId] ?? ['amount' => 0, 'account_name' => $current['account_name']];

            $change = $current['amount'] - $previous['amount'];
            $previousAmount = $previous['amount'] ?? 0;
            $percentChange = $previousAmount != 0
                ? (($change / $previousAmount) * 100)
                : 0;

            $data[] = [
                'account_id' => $accountId,
                'account_name' => $current['account_name'],
                'account_code' => $current['account_code'],
                'account_type' => $current['account_type'],
                'current_period' => abs($current['amount']),
                'previous_period' => abs($previousAmount),
                'change' => abs($change),
                'change_percent' => round($percentChange, 2),
                'is_positive_change' => $change >= 0,
            ];
        }

        // Calculate summary
        $summary = [
            'total_current' => collect($data)->sum('current_period'),
            'total_previous' => collect($data)->sum('previous_period'),
            'total_change' => collect($data)->sum('change'),
            'periods_compared' => 2,
        ];

        return [
            'data' => $data,
            'summary' => $summary,
        ];
    }

    /**
     * Generate ratio analysis report
     */
    public function generateRatioReport(FinancialReport $report): array
    {
        $config = $report->config;
        $start = $report->start_date;
        $end = $report->end_date;

        // Get financial data
        $assets = $this->getTotalAssets($start, $end);
        $liabilities = $this->getTotalLiabilities($start, $end);
        $equity = $this->getTotalEquity($start, $end);
        $currentAssets = $this->getCurrentAssets($start, $end);
        $currentLiabilities = $this->getCurrentLiabilities($start, $end);
        $revenue = $this->getRevenue($start, $end);
        $expenses = $this->getTotalExpenses($start, $end);
        $netIncome = $revenue - $expenses;
        $inventory = $this->getInventory($start, $end);
        $receivables = $this->getReceivables($start, $end);
        $payables = $this->getPayables($start, $end);

        // Calculate ratios
        $ratios = [];

        // Liquidity Ratios
        if ($config['include_liquidity'] ?? true) {
            $currentRatio = $currentLiabilities != 0 ? $currentAssets / $currentLiabilities : 0;
            $quickRatio = $currentLiabilities != 0 ? ($currentAssets - $inventory) / $currentLiabilities : 0;

            $ratios['Liquidity Ratios'] = [
                [
                    'ratio_name' => 'Current Ratio',
                    'value' => round($currentRatio, 2),
                    'benchmark' => '2.0',
                    'status' => $currentRatio >= 2 ? 'good' : ($currentRatio >= 1 ? 'fair' : 'poor'),
                    'formula' => 'Current Assets / Current Liabilities',
                ],
                [
                    'ratio_name' => 'Quick Ratio',
                    'value' => round($quickRatio, 2),
                    'benchmark' => '1.0',
                    'status' => $quickRatio >= 1 ? 'good' : ($quickRatio >= 0.5 ? 'fair' : 'poor'),
                    'formula' => '(Current Assets - Inventory) / Current Liabilities',
                ],
            ];
        }

        // Profitability Ratios
        if ($config['include_profitability'] ?? true) {
            $grossProfitMargin = $revenue != 0 ? (($revenue - $expenses) / $revenue) * 100 : 0;
            $netProfitMargin = $revenue != 0 ? ($netIncome / $revenue) * 100 : 0;
            $roi = $equity != 0 ? ($netIncome / $equity) * 100 : 0;

            $ratios['Profitability Ratios'] = [
                [
                    'ratio_name' => 'Gross Profit Margin',
                    'value' => round($grossProfitMargin, 2) . '%',
                    'benchmark' => '40%',
                    'status' => $grossProfitMargin >= 40 ? 'good' : ($grossProfitMargin >= 20 ? 'fair' : 'poor'),
                    'formula' => '(Revenue - COGS) / Revenue',
                ],
                [
                    'ratio_name' => 'Net Profit Margin',
                    'value' => round($netProfitMargin, 2) . '%',
                    'benchmark' => '10%',
                    'status' => $netProfitMargin >= 10 ? 'good' : ($netProfitMargin >= 5 ? 'fair' : 'poor'),
                    'formula' => 'Net Income / Revenue',
                ],
                [
                    'ratio_name' => 'Return on Investment (ROI)',
                    'value' => round($roi, 2) . '%',
                    'benchmark' => '15%',
                    'status' => $roi >= 15 ? 'good' : ($roi >= 5 ? 'fair' : 'poor'),
                    'formula' => 'Net Income / Equity',
                ],
            ];
        }

        // Solvency Ratios
        if ($config['include_solvency'] ?? true) {
            $debtToEquity = $equity != 0 ? ($liabilities / $equity) : 0;
            $debtRatio = $assets != 0 ? ($liabilities / $assets) * 100 : 0;

            $ratios['Solvency Ratios'] = [
                [
                    'ratio_name' => 'Debt-to-Equity Ratio',
                    'value' => round($debtToEquity, 2),
                    'benchmark' => '1.0',
                    'status' => $debtToEquity <= 1 ? 'good' : ($debtToEquity <= 2 ? 'fair' : 'poor'),
                    'formula' => 'Total Liabilities / Total Equity',
                ],
                [
                    'ratio_name' => 'Debt Ratio',
                    'value' => round($debtRatio, 2) . '%',
                    'benchmark' => '50%',
                    'status' => $debtRatio <= 50 ? 'good' : ($debtRatio <= 70 ? 'fair' : 'poor'),
                    'formula' => 'Total Liabilities / Total Assets',
                ],
            ];
        }

        // Efficiency Ratios
        if ($config['include_efficiency'] ?? true) {
            $inventoryTurnover = $inventory != 0 ? $expenses / $inventory : 0;
            $receivablesTurnover = $receivables != 0 ? $revenue / $receivables : 0;
            $payablesTurnover = $payables != 0 ? $expenses / $payables : 0;

            $ratios['Efficiency Ratios'] = [
                [
                    'ratio_name' => 'Inventory Turnover',
                    'value' => round($inventoryTurnover, 2),
                    'benchmark' => '6.0',
                    'status' => $inventoryTurnover >= 6 ? 'good' : ($inventoryTurnover >= 3 ? 'fair' : 'poor'),
                    'formula' => 'COGS / Average Inventory',
                ],
                [
                    'ratio_name' => 'Receivables Turnover',
                    'value' => round($receivablesTurnover, 2),
                    'benchmark' => '8.0',
                    'status' => $receivablesTurnover >= 8 ? 'good' : ($receivablesTurnover >= 4 ? 'fair' : 'poor'),
                    'formula' => 'Revenue / Average Receivables',
                ],
                [
                    'ratio_name' => 'Payables Turnover',
                    'value' => round($payablesTurnover, 2),
                    'benchmark' => '10.0',
                    'status' => $payablesTurnover >= 10 ? 'good' : ($payablesTurnover >= 5 ? 'fair' : 'poor'),
                    'formula' => 'Purchases / Average Payables',
                ],
            ];
        }

        // Flatten ratios for display
        $data = [];
        foreach ($ratios as $category => $categoryRatios) {
            foreach ($categoryRatios as $ratio) {
                $data[] = array_merge($ratio, ['category' => $category]);
            }
        }

        $summary = [
            'total_ratios' => count($data),
            'good_ratios' => count(array_filter($data, fn($r) => $r['status'] === 'good')),
            'fair_ratios' => count(array_filter($data, fn($r) => $r['status'] === 'fair')),
            'poor_ratios' => count(array_filter($data, fn($r) => $r['status'] === 'poor')),
        ];

        return [
            'data' => $data,
            'summary' => $summary,
        ];
    }

    /**
     * Generate cash flow projection
     */
    public function generateCashFlowReport(FinancialReport $report): array
    {
        $config = $report->config;
        $start = $report->start_date;
        $end = $report->end_date;
        $projectionPeriods = $config['projection_periods'] ?? 12;

        // Get historical cash flows
        $historicalData = $this->getHistoricalCashFlows($start, $end);

        // Calculate monthly averages
        $monthlyOperatingAvg = collect($historicalData['operating'])->avg() ?? 0;
        $monthlyInvestingAvg = collect($historicalData['investing'])->avg() ?? 0;
        $monthlyFinancingAvg = collect($historicalData['financing'])->avg() ?? 0;

        // Generate projections
        $projections = [];
        $currentDate = now();

        for ($i = 1; $i <= $projectionPeriods; $i++) {
            $projectedDate = $currentDate->copy()->addMonths($i);

            // Add some growth assumption (e.g., 2% per month)
            $growthFactor = 1 + (0.02 * $i);

            $projections[] = [
                'period' => $projectedDate->format('M Y'),
                'operating' => round($monthlyOperatingAvg * $growthFactor, 2),
                'investing' => round($monthlyInvestingAvg * $growthFactor, 2),
                'financing' => round($monthlyFinancingAvg * $growthFactor, 2),
                'net_cash_flow' => round(($monthlyOperatingAvg + $monthlyInvestingAvg + $monthlyFinancingAvg) * $growthFactor, 2),
            ];
        }

        // Calculate cumulative cash flow
        $cumulative = 0;
        foreach ($projections as &$projection) {
            $cumulative += $projection['net_cash_flow'];
            $projection['cumulative_cash_flow'] = round($cumulative, 2);
        }

        $data = [
            'historical' => [
                'operating_avg' => round($monthlyOperatingAvg, 2),
                'investing_avg' => round($monthlyInvestingAvg, 2),
                'financing_avg' => round($monthlyFinancingAvg, 2),
            ],
            'projections' => $projections,
        ];

        $summary = [
            'total_projected_inflow' => collect($projections)->sum(fn($p) => max(0, $p['net_cash_flow'])),
            'total_projected_outflow' => collect($projections)->sum(fn($p) => min(0, $p['net_cash_flow'])),
            'final_cumulative_cash_flow' => end($projections)['cumulative_cash_flow'],
        ];

        return [
            'data' => $data,
            'summary' => $summary,
        ];
    }

    /**
     * Generate fund flow statement
     */
    public function generateFundFlowReport(FinancialReport $report): array
    {
        $start = $report->start_date;
        $end = $report->end_date;

        // Get beginning and ending balances
        $beginningWorkingCapital = $this->getWorkingCapital($start->copy()->subDay(), $start->copy()->subDay());
        $endingWorkingCapital = $this->getWorkingCapital($end, $end);

        // Calculate changes in working capital
        $changesInWorkingCapital = $this->getChangesInWorkingCapital($start, $end);

        // Sources of funds
        $sources = [
            ['item' => 'Net Income from Operations', 'amount' => $this->getNetIncome($start, $end)],
            ['item' => 'Depreciation', 'amount' => $this->getDepreciation($start, $end)],
            ['item' => 'Increase in Long-term Debt', 'amount' => abs($this->getChangeInLongTermDebt($start, $end))],
            ['item' => 'Issuance of Equity', 'amount' => $this->getEquityIssuance($start, $end)],
            ['item' => 'Decrease in Fixed Assets', 'amount' => abs($this->getChangeInFixedAssets($start, $end))],
        ];

        // Uses of funds
        $uses = [
            ['item' => 'Increase in Fixed Assets', 'amount' => abs($this->getCapitalExpenditure($start, $end))],
            ['item' => 'Decrease in Long-term Debt', 'amount' => abs($this->getRepaymentOfLongTermDebt($start, $end))],
            ['item' => 'Dividends Paid', 'amount' => $this->getDividendsPaid($start, $end)],
            ['item' => 'Increase in Working Capital', 'amount' => $endingWorkingCapital - $beginningWorkingCapital],
        ];

        // Filter out zero amounts
        $sources = array_filter($sources, fn($s) => $s['amount'] != 0);
        $uses = array_filter($uses, fn($u) => $u['amount'] != 0);

        // Calculate totals
        $totalSources = collect($sources)->sum('amount');
        $totalUses = collect($uses)->sum('amount');

        // Calculate percentages
        $sources = array_map(function ($source) use ($totalSources) {
            $source['percentage'] = $totalSources != 0 ? round(($source['amount'] / $totalSources) * 100, 2) : 0;
            return $source;
        }, $sources);

        $uses = array_map(function ($use) use ($totalUses) {
            $use['percentage'] = $totalUses != 0 ? round(($use['amount'] / $totalUses) * 100, 2) : 0;
            return $use;
        }, $uses);

        $data = [
            'sources' => array_values($sources),
            'uses' => array_values($uses),
            'changes_in_working_capital' => array_values($changesInWorkingCapital),
        ];

        $summary = [
            'total_sources' => $totalSources,
            'total_uses' => $totalUses,
            'net_change' => $totalSources - $totalUses,
            'beginning_working_capital' => $beginningWorkingCapital,
            'ending_working_capital' => $endingWorkingCapital,
        ];

        return [
            'data' => $data,
            'summary' => $summary,
        ];
    }

    /**
     * Generate custom report
     */
    public function generateCustomReport(FinancialReport $report): array
    {
        $config = $report->config;
        $columns = $report->columns;
        $filters = $report->filters;

        // Build custom query based on configuration
        $query = ChartOfAccount::query();

        // Apply filters
        if (isset($filters['account_types'])) {
            $query->whereIn('type', $filters['account_types']);
        }

        if (isset($filters['parent_id'])) {
            $query->where('parent_id', $filters['parent_id']);
        }

        // Get accounts
        $accounts = $query->with('children')->get();

        // Build data based on selected columns
        $data = [];
        foreach ($accounts as $account) {
            $row = [
                'account_id' => $account->id,
                'account_name' => $account->name,
                'account_code' => $account->code,
                'account_type' => $account->type,
            ];

            // Add custom columns
            foreach ($columns as $column) {
                $field = $column['field'];
                if ($field === 'balance') {
                    $row[$field] = $account->balance;
                } elseif ($field === 'type') {
                    $row[$field] = $account->type;
                }
            }

            $data[] = $row;
        }

        $summary = [
            'total_accounts' => count($data),
            'filters_applied' => $filters,
        ];

        return [
            'data' => $data,
            'summary' => $summary,
        ];
    }

    // ==================== HELPER METHODS ====================

    private function getAccountBalances($start, $end): array
    {
        return ChartOfAccount::with(['journalEntries' => function ($q) use ($start, $end) {
            $q->whereBetween('date', [$start, $end]);
        }])
            ->get()
            ->map(function ($account) {
                return [
                    'account_id' => $account->id,
                    'account_name' => $account->name,
                    'account_code' => $account->code,
                    'account_type' => $account->type,
                    'amount' => $account->balance,
                ];
            })
            ->keyBy('account_id')
            ->toArray();
    }

    private function getTotalAssets($start, $end): float
    {
        return ChartOfAccount::where('type', 'asset')->sum('balance');
    }

    private function getTotalLiabilities($start, $end): float
    {
        return ChartOfAccount::where('type', 'liability')->sum('balance');
    }

    private function getTotalEquity($start, $end): float
    {
        return ChartOfAccount::where('type', 'equity')->sum('balance');
    }

    private function getCurrentAssets($start, $end): float
    {
        return ChartOfAccount::where('type', 'asset')
            ->where('sub_type', 'current')
            ->sum('balance');
    }

    private function getCurrentLiabilities($start, $end): float
    {
        return ChartOfAccount::where('type', 'liability')
            ->where('sub_type', 'current')
            ->sum('balance');
    }

    private function getRevenue($start, $end): float
    {
        return BankTransaction::whereBetween('transaction_date', [$start, $end])
            ->where('type', 'deposit')
            ->sum('amount');
    }

    private function getTotalExpenses($start, $end): float
    {
        return Expense::whereBetween('expense_date', [$start, $end])
            ->where('is_approved', true)
            ->sum('amount');
    }

    private function getInventory($start, $end): float
    {
        return ChartOfAccount::where('code', 'like', '15%')->sum('balance');
    }

    private function getReceivables($start, $end): float
    {
        return ChartOfAccount::where('code', 'like', '11%')->sum('balance');
    }

    private function getPayables($start, $end): float
    {
        return ChartOfAccount::where('code', 'like', '21%')->sum('balance');
    }

    private function getHistoricalCashFlows($start, $end): array
    {
        // Simplified implementation
        return [
            'operating' => [10000, 12000, 11000],
            'investing' => [-5000, -3000, -4000],
            'financing' => [2000, 1000, 1500],
        ];
    }

    private function getWorkingCapital($start, $end): float
    {
        return $this->getCurrentAssets($start, $end) - $this->getCurrentLiabilities($start, $end);
    }

    private function getChangesInWorkingCapital($start, $end): array
    {
        return [
            ['item' => 'Change in Cash', 'amount' => 5000],
            ['item' => 'Change in Receivables', 'amount' => -2000],
            ['item' => 'Change in Inventory', 'amount' => 3000],
            ['item' => 'Change in Payables', 'amount' => 4000],
        ];
    }

    private function getNetIncome($start, $end): float
    {
        return $this->getRevenue($start, $end) - $this->getTotalExpenses($start, $end);
    }

    private function getDepreciation($start, $end): float
    {
        return 5000; // Simplified
    }

    private function getChangeInLongTermDebt($start, $end): float
    {
        return 10000; // Simplified
    }

    private function getEquityIssuance($start, $end): float
    {
        return 0; // Simplified
    }

    private function getChangeInFixedAssets($start, $end): float
    {
        return -15000; // Simplified
    }

    private function getCapitalExpenditure($start, $end): float
    {
        return 20000; // Simplified
    }

    private function getRepaymentOfLongTermDebt($start, $end): float
    {
        return -5000; // Simplified
    }

    private function getDividendsPaid($start, $end): float
    {
        return 3000; // Simplified
    }
}
