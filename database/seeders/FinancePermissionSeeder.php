<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class FinancePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * This seeder creates all finance-related permissions
     */
    public function run(): void
    {
        $permissions = [
            [
                'group' => 'Finance',
                'modules' => [
                    [
                        'name' => 'Dashboard',
                        'permissions' => [
                            ['label' => 'View Finance Dashboard', 'key' => 'finance_dashboard_view', 'slug' => 'finance.dashboard.index'],
                        ],
                    ],
                    [
                        'name' => 'Accounts',
                        'permissions' => [
                            ['label' => 'View Chart of Accounts', 'key' => 'finance_accounts_view', 'slug' => 'finance.accounts.index'],
                            ['label' => 'Create Account', 'key' => 'finance_accounts_create', 'slug' => 'finance.accounts.create'],
                            ['label' => 'Edit Account', 'key' => 'finance_accounts_edit', 'slug' => 'finance.accounts.edit'],
                            ['label' => 'Delete Account', 'key' => 'finance_accounts_delete', 'slug' => 'finance.accounts.delete'],
                        ],
                    ],
                    [
                        'name' => 'Banks',
                        'permissions' => [
                            ['label' => 'View Bank Accounts', 'key' => 'finance_banks_view', 'slug' => 'finance.banks.index'],
                            ['label' => 'Create Bank Account', 'key' => 'finance_banks_create', 'slug' => 'finance.banks.create'],
                            ['label' => 'Edit Bank Account', 'key' => 'finance_banks_edit', 'slug' => 'finance.banks.edit'],
                            ['label' => 'Delete Bank Account', 'key' => 'finance_banks_delete', 'slug' => 'finance.banks.delete'],
                            ['label' => 'View Bank Transactions', 'key' => 'finance_banks_transactions', 'slug' => 'finance.banks.transactions'],
                            ['label' => 'Deposit Funds', 'key' => 'finance_banks_deposit', 'slug' => 'finance.banks.deposit'],
                            ['label' => 'Withdraw Funds', 'key' => 'finance_banks_withdraw', 'slug' => 'finance.banks.withdraw'],
                            ['label' => 'Transfer Funds', 'key' => 'finance_banks_transfer', 'slug' => 'finance.banks.transfer'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Currencies Module ====================
                    [
                        'name' => 'Currencies',
                        'permissions' => [
                            ['label' => 'View Currencies', 'key' => 'finance_currencies_view', 'slug' => 'finance.currencies.index'],
                            ['label' => 'Create Currency', 'key' => 'finance_currencies_create', 'slug' => 'finance.currencies.create'],
                            ['label' => 'Edit Currency', 'key' => 'finance_currencies_edit', 'slug' => 'finance.currencies.edit'],
                            ['label' => 'Delete Currency', 'key' => 'finance_currencies_delete', 'slug' => 'finance.currencies.delete'],
                            ['label' => 'Update Exchange Rate', 'key' => 'finance_currencies_update_rate', 'slug' => 'finance.currencies.update-rate'],
                        ],
                    ],
                    [
                        'name' => 'Transactions',
                        'permissions' => [
                            ['label' => 'View Transactions', 'key' => 'finance_transactions_view', 'slug' => 'finance.transactions.index'],
                            ['label' => 'Create Transaction', 'key' => 'finance_transactions_create', 'slug' => 'finance.transactions.create'],
                            ['label' => 'Edit Transaction', 'key' => 'finance_transactions_edit', 'slug' => 'finance.transactions.edit'],
                            ['label' => 'Delete Transaction', 'key' => 'finance_transactions_delete', 'slug' => 'finance.transactions.delete'],
                            ['label' => 'Approve Transaction', 'key' => 'finance_transactions_approve', 'slug' => 'finance.transactions.approve'],
                        ],
                    ],
                    [
                        'name' => 'Expenses',
                        'permissions' => [
                            ['label' => 'View Expenses', 'key' => 'finance_expenses_view', 'slug' => 'finance.expenses.index'],
                            ['label' => 'Create Expense', 'key' => 'finance_expenses_create', 'slug' => 'finance.expenses.create'],
                            ['label' => 'Edit Expense', 'key' => 'finance_expenses_edit', 'slug' => 'finance.expenses.edit'],
                            ['label' => 'Delete Expense', 'key' => 'finance_expenses_delete', 'slug' => 'finance.expenses.delete'],
                            ['label' => 'Approve Expense', 'key' => 'finance_expenses_approve', 'slug' => 'finance.expenses.approve'],
                        ],
                    ],
                    [
                        'name' => 'Revenue',
                        'permissions' => [
                            ['label' => 'View Revenue', 'key' => 'finance_revenue_view', 'slug' => 'finance.revenue.index'],
                            ['label' => 'Record Revenue', 'key' => 'finance_revenue_create', 'slug' => 'finance.revenue.create'],
                            ['label' => 'Edit Revenue', 'key' => 'finance_revenue_edit', 'slug' => 'finance.revenue.edit'],
                            ['label' => 'Delete Revenue', 'key' => 'finance_revenue_delete', 'slug' => 'finance.revenue.delete'],
                        ],
                    ],
                    [
                        'name' => 'Reports',
                        'permissions' => [
                            ['label' => 'View Reports', 'key' => 'finance_reports_view', 'slug' => 'finance.reports.index'],
                            ['label' => 'Profit & Loss Report', 'key' => 'finance_reports_profit_loss', 'slug' => 'finance.reports.profit-loss'],
                            ['label' => 'Balance Sheet', 'key' => 'finance_reports_balance_sheet', 'slug' => 'finance.reports.balance-sheet'],
                            ['label' => 'Cash Flow Statement', 'key' => 'finance_reports_cash_flow', 'slug' => 'finance.reports.cash-flow'],
                            ['label' => 'Trial Balance', 'key' => 'finance_reports_trial_balance', 'slug' => 'finance.reports.trial-balance'],
                            ['label' => 'General Ledger', 'key' => 'finance_reports_general_ledger', 'slug' => 'finance.reports.general-ledger'],
                            ['label' => 'Daily Financial Report', 'key' => 'finance_reports_daily', 'slug' => 'finance.reports.daily'],
                            ['label' => 'Export Reports', 'key' => 'finance_reports_export', 'slug' => 'finance.reports.export'],
                        ],
                    ],
                    [
                        'name' => 'Daily Reports',
                        'permissions' => [
                            ['label' => 'View Daily Reports', 'key' => 'finance_daily_reports_view', 'slug' => 'finance.daily-reports.index'],
                            ['label' => 'Generate Daily Report', 'key' => 'finance_daily_reports_generate', 'slug' => 'finance.daily-reports.generate'],
                            ['label' => 'Regenerate Daily Report', 'key' => 'finance_daily_reports_regenerate', 'slug' => 'finance.daily-reports.regenerate'],
                            ['label' => 'Delete Daily Report', 'key' => 'finance_daily_reports_delete', 'slug' => 'finance.daily-reports.delete'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Budgeting & Planning Module ====================
                    [
                        'name' => 'Budgets',
                        'permissions' => [
                            ['label' => 'View Budgets', 'key' => 'finance_budgets_view', 'slug' => 'finance.budgets.index'],
                            ['label' => 'Create Budget', 'key' => 'finance_budgets_create', 'slug' => 'finance.budgets.create'],
                            ['label' => 'Edit Budget', 'key' => 'finance_budgets_edit', 'slug' => 'finance.budgets.edit'],
                            ['label' => 'Delete Budget', 'key' => 'finance_budgets_delete', 'slug' => 'finance.budgets.delete'],
                            ['label' => 'Approve Budget', 'key' => 'finance_budgets_approve', 'slug' => 'finance.budgets.approve'],
                        ],
                    ],
                    [
                        'name' => 'Cost Centers',
                        'permissions' => [
                            ['label' => 'View Cost Centers', 'key' => 'finance_cost_centers_view', 'slug' => 'finance.cost-centers.index'],
                            ['label' => 'Create Cost Center', 'key' => 'finance_cost_centers_create', 'slug' => 'finance.cost-centers.create'],
                            ['label' => 'Edit Cost Center', 'key' => 'finance_cost_centers_edit', 'slug' => 'finance.cost-centers.edit'],
                            ['label' => 'Delete Cost Center', 'key' => 'finance_cost_centers_delete', 'slug' => 'finance.cost-centers.delete'],
                        ],
                    ],
                    [
                        'name' => 'Projects',
                        'permissions' => [
                            ['label' => 'View Projects', 'key' => 'finance_projects_view', 'slug' => 'finance.projects.index'],
                            ['label' => 'Create Project', 'key' => 'finance_projects_create', 'slug' => 'finance.projects.create'],
                            ['label' => 'Edit Project', 'key' => 'finance_projects_edit', 'slug' => 'finance.projects.edit'],
                            ['label' => 'Delete Project', 'key' => 'finance_projects_delete', 'slug' => 'finance.projects.delete'],
                        ],
                    ],
                    [
                        'name' => 'Fiscal Years',
                        'permissions' => [
                            ['label' => 'View Fiscal Years', 'key' => 'finance_fiscal_years_view', 'slug' => 'finance.fiscal-years.index'],
                            ['label' => 'Create Fiscal Year', 'key' => 'finance_fiscal_years_create', 'slug' => 'finance.fiscal-years.create'],
                            ['label' => 'Edit Fiscal Year', 'key' => 'finance_fiscal_years_edit', 'slug' => 'finance.fiscal-years.edit'],
                            ['label' => 'Delete Fiscal Year', 'key' => 'finance_fiscal_years_delete', 'slug' => 'finance.fiscal-years.delete'],
                            ['label' => 'Close Fiscal Year', 'key' => 'finance_fiscal_years_close', 'slug' => 'finance.fiscal-years.close'],
                            ['label' => 'Reopen Fiscal Year', 'key' => 'finance_fiscal_years_reopen', 'slug' => 'finance.fiscal-years.reopen'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Fixed Assets Module ====================
                    [
                        'name' => 'Fixed Assets',
                        'permissions' => [
                            ['label' => 'View Fixed Assets', 'key' => 'finance_fixed_assets_view', 'slug' => 'finance.fixed-assets.index'],
                            ['label' => 'Create Fixed Asset', 'key' => 'finance_fixed_assets_create', 'slug' => 'finance.fixed-assets.create'],
                            ['label' => 'Edit Fixed Asset', 'key' => 'finance_fixed_assets_edit', 'slug' => 'finance.fixed-assets.edit'],
                            ['label' => 'Delete Fixed Asset', 'key' => 'finance_fixed_assets_delete', 'slug' => 'finance.fixed-assets.delete'],
                            ['label' => 'Dispose Fixed Asset', 'key' => 'finance_fixed_assets_dispose', 'slug' => 'finance.fixed-assets.dispose'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Cheque/PDC Management Module ====================
                    [
                        'name' => 'Cheques/PDC',
                        'permissions' => [
                            ['label' => 'View Cheques', 'key' => 'finance_cheques_view', 'slug' => 'finance.cheques.index'],
                            ['label' => 'Create Cheque', 'key' => 'finance_cheques_create', 'slug' => 'finance.cheques.create'],
                            ['label' => 'Edit Cheque', 'key' => 'finance_cheques_edit', 'slug' => 'finance.cheques.edit'],
                            ['label' => 'Delete Cheque', 'key' => 'finance_cheques_delete', 'slug' => 'finance.cheques.delete'],
                            ['label' => 'Deposit Cheque', 'key' => 'finance_cheques_deposit', 'slug' => 'finance.cheques.deposit'],
                            ['label' => 'Clear Cheque', 'key' => 'finance_cheques_clear', 'slug' => 'finance.cheques.clear'],
                            ['label' => 'Bounce Cheque', 'key' => 'finance_cheques_bounce', 'slug' => 'finance.cheques.bounce'],
                            ['label' => 'Cancel Cheque', 'key' => 'finance_cheques_cancel', 'slug' => 'finance.cheques.cancel'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: VAT/Tax Ledger Module ====================
                    [
                        'name' => 'VAT/Tax Ledger',
                        'permissions' => [
                            ['label' => 'View VAT/Tax Ledger', 'key' => 'finance_vat_tax_view', 'slug' => 'finance.vat-tax.index'],
                            ['label' => 'Create VAT/Tax Entry', 'key' => 'finance_vat_tax_create', 'slug' => 'finance.vat-tax.create'],
                            ['label' => 'Edit VAT/Tax Entry', 'key' => 'finance_vat_tax_edit', 'slug' => 'finance.vat-tax.edit'],
                            ['label' => 'Delete VAT/Tax Entry', 'key' => 'finance_vat_tax_delete', 'slug' => 'finance.vat-tax.delete'],
                            ['label' => 'Mark as Paid', 'key' => 'finance_vat_tax_mark_paid', 'slug' => 'finance.vat-tax.mark-paid'],
                            ['label' => 'Mark as Filed', 'key' => 'finance_vat_tax_mark_filed', 'slug' => 'finance.vat-tax.mark-filed'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Journal Entries Module ====================
                    [
                        'name' => 'Journal Entries',
                        'permissions' => [
                            ['label' => 'View Journal Entries', 'key' => 'finance_journal_view', 'slug' => 'finance.journal-entries.index'],
                            ['label' => 'Create Journal Entry', 'key' => 'finance_journal_create', 'slug' => 'finance.journal-entries.create'],
                            ['label' => 'Edit Journal Entry', 'key' => 'finance_journal_edit', 'slug' => 'finance.journal-entries.edit'],
                            ['label' => 'Delete Journal Entry', 'key' => 'finance_journal_delete', 'slug' => 'finance.journal-entries.delete'],
                            ['label' => 'Reverse Journal Entry', 'key' => 'finance_journal_reverse', 'slug' => 'finance.journal-entries.reverse'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Accounts Payable/Receivable Module ====================
                    [
                        'name' => 'Accounts Payable',
                        'permissions' => [
                            ['label' => 'View Accounts Payable', 'key' => 'finance_ap_view', 'slug' => 'finance.accounts-payable.index'],
                            ['label' => 'Create Accounts Payable', 'key' => 'finance_ap_create', 'slug' => 'finance.accounts-payable.create'],
                            ['label' => 'Edit Accounts Payable', 'key' => 'finance_ap_edit', 'slug' => 'finance.accounts-payable.edit'],
                            ['label' => 'Delete Accounts Payable', 'key' => 'finance_ap_delete', 'slug' => 'finance.accounts-payable.delete'],
                        ],
                    ],
                    [
                        'name' => 'Accounts Receivable',
                        'permissions' => [
                            ['label' => 'View Accounts Receivable', 'key' => 'finance_ar_view', 'slug' => 'finance.accounts-receivable.index'],
                            ['label' => 'Create Accounts Receivable', 'key' => 'finance_ar_create', 'slug' => 'finance.accounts-receivable.create'],
                            ['label' => 'Edit Accounts Receivable', 'key' => 'finance_ar_edit', 'slug' => 'finance.accounts-receivable.edit'],
                            ['label' => 'Delete Accounts Receivable', 'key' => 'finance_ar_delete', 'slug' => 'finance.accounts-receivable.delete'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Bank Reconciliations Module ====================
                    [
                        'name' => 'Bank Reconciliations',
                        'permissions' => [
                            ['label' => 'View Bank Reconciliations', 'key' => 'finance_reconciliations_view', 'slug' => 'finance.bank-reconciliations.index'],
                            ['label' => 'Create Bank Reconciliation', 'key' => 'finance_reconciliations_create', 'slug' => 'finance.bank-reconciliations.create'],
                            ['label' => 'Edit Bank Reconciliation', 'key' => 'finance_reconciliations_edit', 'slug' => 'finance.bank-reconciliations.edit'],
                            ['label' => 'Delete Bank Reconciliation', 'key' => 'finance_reconciliations_delete', 'slug' => 'finance.bank-reconciliations.delete'],
                            ['label' => 'Reconcile Bank Account', 'key' => 'finance_reconciliations_reconcile', 'slug' => 'finance.bank-reconciliations.reconcile'],
                            ['label' => 'Reset Bank Reconciliation', 'key' => 'finance_reconciliations_reset', 'slug' => 'finance.bank-reconciliations.reset'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Advanced Financial Reports Module ====================
                    [
                        'name' => 'Advanced Reports',
                        'permissions' => [
                            ['label' => 'View Advanced Reports', 'key' => 'finance_advanced_reports_view', 'slug' => 'finance.reports.custom.index'],
                            ['label' => 'Create Advanced Report', 'key' => 'finance_advanced_reports_create', 'slug' => 'finance.reports.custom.create'],
                            ['label' => 'Edit Advanced Report', 'key' => 'finance_advanced_reports_edit', 'slug' => 'finance.reports.custom.edit'],
                            ['label' => 'Delete Advanced Report', 'key' => 'finance_advanced_reports_delete', 'slug' => 'finance.reports.custom.delete'],
                            ['label' => 'Generate Advanced Report', 'key' => 'finance_advanced_reports_generate', 'slug' => 'finance.reports.custom.generate'],
                            ['label' => 'Export Advanced Report', 'key' => 'finance_advanced_reports_export', 'slug' => 'finance.reports.custom.export'],
                        ],
                    ],
                    // ==================== NEWLY ADDED: Finance Audit Trail Module ====================
                    [
                        'name' => 'Audit Trail',
                        'permissions' => [
                            ['label' => 'View Audit Logs', 'key' => 'finance_audit_view', 'slug' => 'finance.audit.index'],
                            ['label' => 'View Audit Statistics', 'key' => 'finance_audit_statistics', 'slug' => 'finance.audit.statistics'],
                            ['label' => 'View Entity History', 'key' => 'finance_audit_history', 'slug' => 'finance.audit.history'],
                            ['label' => 'View Entity Timeline', 'key' => 'finance_audit_timeline', 'slug' => 'finance.audit.timeline'],
                        ],
                    ],
                ],
            ],
        ];

        $count = 0;
        foreach ($permissions as $groupData) {
            $groupName = $groupData['group'];

            foreach ($groupData['modules'] as $moduleData) {
                $moduleName = $moduleData['name'];

                foreach ($moduleData['permissions'] as $permData) {
                    Permission::updateOrCreate(
                        ['slug' => $permData['slug']],
                        [
                            'name' => $permData['label'],
                            'key' => $permData['key'] ?? null,
                            'slug' => $permData['slug'] ?? null,
                            'group_name' => $groupName,
                            'module_name' => $moduleName,
                        ]
                    );
                    $count++;
                }
            }
        }

        $this->command->info("Seeded {$count} Finance permissions.");
    }
}
