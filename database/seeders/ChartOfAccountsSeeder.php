<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class ChartOfAccountsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Creates standard chart of accounts for Bangladeshi business
     */
    public function run(): void
    {
        $accounts = [
            // ASSETS (1000-1999)
            [
                'name' => 'Cash on Hand',
                'code' => '1001',
                'type' => 'asset',
                'description' => 'Physical cash in office',
            ],
            [
                'name' => 'bKash Account',
                'code' => '1002',
                'type' => 'asset',
                'description' => 'bKash mobile wallet balance',
            ],
            [
                'name' => 'Nagad Account',
                'code' => '1003',
                'type' => 'asset',
                'description' => 'Nagad mobile wallet balance',
            ],
            [
                'name' => 'Rocket Account',
                'code' => '1004',
                'type' => 'asset',
                'description' => 'Rocket mobile wallet balance',
            ],
            [
                'name' => 'Bank - Brac Bank',
                'code' => '1005',
                'type' => 'asset',
                'description' => 'Brac Bank current account',
            ],
            [
                'name' => 'Bank - DBBL',
                'code' => '1006',
                'type' => 'asset',
                'description' => 'Dutch-Bangla Bank Limited account',
            ],
            [
                'name' => 'Accounts Receivable',
                'code' => '1010',
                'type' => 'asset',
                'description' => 'Money owed by customers',
            ],
            [
                'name' => 'Inventory - Raw Materials',
                'code' => '1020',
                'type' => 'asset',
                'description' => 'Raw materials inventory',
            ],
            [
                'name' => 'Inventory - Finished Goods',
                'code' => '1021',
                'type' => 'asset',
                'description' => 'Finished products ready for sale',
            ],
            [
                'name' => 'Prepaid Expenses',
                'code' => '1030',
                'type' => 'asset',
                'description' => 'Payments made in advance',
            ],
            [
                'name' => 'Office Equipment',
                'code' => '1040',
                'type' => 'asset',
                'description' => 'Computers, furniture, and equipment',
            ],
            [
                'name' => 'Accumulated Depreciation',
                'code' => '1041',
                'type' => 'asset',
                'description' => 'Accumulated depreciation on fixed assets',
            ],

            // LIABILITIES (2000-2999)
            [
                'name' => 'Accounts Payable',
                'code' => '2001',
                'type' => 'liability',
                'description' => 'Money owed to suppliers',
            ],
            [
                'name' => 'Accrued Expenses',
                'code' => '2010',
                'type' => 'liability',
                'description' => 'Expenses incurred but not yet paid',
            ],
            [
                'name' => 'Unearned Revenue',
                'code' => '2020',
                'type' => 'liability',
                'description' => 'Payments received for goods/services not yet delivered',
            ],
            [
                'name' => 'Loans Payable',
                'code' => '2030',
                'type' => 'liability',
                'description' => 'Bank loans and other borrowings',
            ],
            [
                'name' => 'Tax Payable',
                'code' => '2040',
                'type' => 'liability',
                'description' => 'Taxes owed to government',
            ],

            // EQUITY (3000-3999)
            [
                'name' => 'Owner\'s Capital',
                'code' => '3001',
                'type' => 'equity',
                'description' => 'Owner\'s investment in the business',
            ],
            [
                'name' => 'Retained Earnings',
                'code' => '3010',
                'type' => 'equity',
                'description' => 'Accumulated profits retained in the business',
            ],
            [
                'name' => 'Current Year Earnings',
                'code' => '3020',
                'type' => 'equity',
                'description' => 'Profits for the current financial year',
            ],

            // REVENUE / INCOME (4000-4999)
            [
                'name' => 'Sales Revenue',
                'code' => '4001',
                'type' => 'income',
                'description' => 'Revenue from retail sales',
            ],
            [
                'name' => 'Wholesale Revenue',
                'code' => '4002',
                'type' => 'income',
                'description' => 'Revenue from wholesale operations',
            ],
            [
                'name' => 'Daraz Revenue',
                'code' => '4003',
                'type' => 'income',
                'description' => 'Revenue from Daraz marketplace',
            ],
            [
                'name' => 'Other Marketplace Revenue',
                'code' => '4004',
                'type' => 'income',
                'description' => 'Revenue from other online marketplaces',
            ],
            [
                'name' => 'Service Income',
                'code' => '4010',
                'type' => 'income',
                'description' => 'Income from services provided',
            ],
            [
                'name' => 'Discount Income',
                'code' => '4020',
                'type' => 'income',
                'description' => 'Income from discounts received',
            ],
            [
                'name' => 'Interest Income',
                'code' => '4030',
                'type' => 'income',
                'description' => 'Interest earned on bank deposits',
            ],
            [
                'name' => 'Other Income',
                'code' => '4099',
                'type' => 'income',
                'description' => 'Miscellaneous income not classified elsewhere',
            ],

            // EXPENSES (5000-5999)
            [
                'name' => 'Cost of Goods Sold',
                'code' => '5001',
                'type' => 'expense',
                'description' => 'Direct cost of products sold',
            ],
            [
                'name' => 'Salaries and Wages',
                'code' => '5010',
                'type' => 'expense',
                'description' => 'Employee salaries and wages',
            ],
            [
                'name' => 'Office Rent',
                'code' => '5020',
                'type' => 'expense',
                'description' => 'Monthly office rent',
            ],
            [
                'name' => 'Utilities - Electricity',
                'code' => '5031',
                'type' => 'expense',
                'description' => 'Electricity bills',
            ],
            [
                'name' => 'Utilities - Gas',
                'code' => '5032',
                'type' => 'expense',
                'description' => 'Gas bills',
            ],
            [
                'name' => 'Utilities - Water',
                'code' => '5033',
                'type' => 'expense',
                'description' => 'Water bills',
            ],
            [
                'name' => 'Utilities - Internet',
                'code' => '5034',
                'type' => 'expense',
                'description' => 'Internet and connectivity',
            ],
            [
                'name' => 'Office Supplies',
                'code' => '5040',
                'type' => 'expense',
                'description' => 'Stationery and office supplies',
            ],
            [
                'name' => 'Printing and Stationery',
                'code' => '5041',
                'type' => 'expense',
                'description' => 'Printing costs and stationery',
            ],
            [
                'name' => 'Repairs and Maintenance',
                'code' => '5050',
                'type' => 'expense',
                'description' => 'Equipment and office maintenance',
            ],
            [
                'name' => 'Transportation Expenses',
                'code' => '5060',
                'type' => 'expense',
                'description' => 'Vehicle and travel expenses',
            ],
            [
                'name' => 'Delivery Expenses',
                'code' => '5061',
                'type' => 'expense',
                'description' => 'Product delivery costs',
            ],
            [
                'name' => 'Marketing and Advertising',
                'code' => '5070',
                'type' => 'expense',
                'description' => 'Marketing and promotional expenses',
            ],
            [
                'name' => 'Bank Charges',
                'code' => '5080',
                'type' => 'expense',
                'description' => 'Bank fees and charges',
            ],
            [
                'name' => 'Mobile Banking Charges',
                'code' => '5081',
                'type' => 'expense',
                'description' => 'bKash, Nagad, Rocket charges',
            ],
            [
                'name' => 'Professional Fees',
                'code' => '5090',
                'type' => 'expense',
                'description' => 'Accountant, legal, and consultant fees',
            ],
            [
                'name' => 'Insurance Expense',
                'code' => '5095',
                'type' => 'expense',
                'description' => 'Insurance premiums',
            ],
            [
                'name' => 'Bad Debts',
                'code' => '5096',
                'type' => 'expense',
                'description' => 'Uncollectible accounts',
            ],
            [
                'name' => 'Depreciation Expense',
                'code' => '5097',
                'type' => 'expense',
                'description' => 'Depreciation on fixed assets',
            ],
            [
                'name' => 'Employee Benefits',
                'code' => '5100',
                'type' => 'expense',
                'description' => 'Employee bonuses, gifts, and benefits',
            ],
            [
                'name' => 'Snacks and Refreshments',
                'code' => '5110',
                'type' => 'expense',
                'description' => 'Office snacks and refreshments',
            ],
            [
                'name' => 'Donations and Charitable Contributions',
                'code' => '5120',
                'type' => 'expense',
                'description' => 'Donations to charitable causes',
            ],
            [
                'name' => 'Miscellaneous Expenses',
                'code' => '5199',
                'type' => 'expense',
                'description' => 'Other miscellaneous business expenses',
            ],
            [
                'name' => 'Tax Expense',
                'code' => '5200',
                'type' => 'expense',
                'description' => 'Income tax and other taxes',
            ],
        ];

        $count = 0;
        foreach ($accounts as $account) {
            ChartOfAccount::updateOrCreate(
                ['code' => $account['code']],
                [
                    'name' => $account['name'],
                    'type' => $account['type'],
                    'description' => $account['description'],
                    'is_active' => true,
                ]
            );
            $count++;
        }

        $this->command->info("Seeded {$count} chart of accounts for Bangladeshi business.");
    }
}
