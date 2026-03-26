<?php

namespace App\Http\Controllers\Api\V2\Hrm;

use App\Http\Controllers\Controller;
use App\Models\Payroll;
use App\Models\User;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\ChartOfAccount;
use App\Models\Bank;
use App\Models\BankTransaction;
use App\Models\Expense;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    use ApiResponse;

    /**
     * 1. List Payrolls (Filter by Month, User, Status)
     */
    public function index(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.payroll.index')) {
            return $this->sendError('You do not have permission to view payroll.', null, 403);
        }

        $query = Payroll::with(['user:id,name', 'user.staffProfile:user_id,designation,department_id,bank_account_name,bank_account_number,bank_name,bank_branch', 'user.staffProfile.department']);

        $user = auth()->user();

        // Check if user is admin
        $isAdmin = false;
        if ($user->role) {
            $isAdmin = in_array($user->role->slug, ['super_admin', 'admin']);
        }
        if (!$isAdmin) {
            $isAdmin = in_array($user->role_id, [8, 1, 2]);
        }

        // Admin can filter by specific user
        if ($request->has('user_id') && $isAdmin) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->month_year) {
            $query->where('month_year', $request->month_year);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Staff can only see their own (unless admin already filtered by user_id above)
        if (!$isAdmin) {
            $query->where('user_id', $user->id);
        }

        return $this->sendSuccess($query->paginate(20));
    }

    /**
     * 2. Generate Salary Sheet for a Month (Admin Only)
     * Rule: 1 staff can have only 1 payroll record per month
     */
    public function generate(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.payroll.process')) {
            return $this->sendError('You do not have permission to generate payroll.', null, 403);
        }

        $request->validate([
            'month_year' => 'required|date_format:Y-m', // e.g. "2025-01"
        ]);

        $month = $request->month_year;

        // Get All Active Staff (Excluding Customers)
        $staffs = User::with('staffProfile')
            ->whereHas('role', fn($q) => $q->whereNotIn('id', [10, 11])) // Exclude customer roles
            ->where('is_active', true)
            ->get();

        if ($staffs->isEmpty()) {
            return $this->sendError('No active staff found to generate payroll.');
        }

        DB::beginTransaction();
        try {
            $count = 0;
            $skipped = 0;

            foreach ($staffs as $staff) {
                // Skip if no staff profile or base salary set
                if (!$staff->staffProfile) {
                    $skipped++;
                    continue;
                }

                $profile = $staff->staffProfile;
                $baseSalary = (float) ($profile->base_salary ?? 0);

                if ($baseSalary <= 0) {
                    $skipped++;
                    continue;
                }

                // Skip if this staff already has payroll for this month (1 staff = 1 time per month)
                if (Payroll::where('user_id', $staff->id)->where('month_year', $month)->exists()) {
                    $skipped++;
                    continue;
                }

                // Get all salary components from staff profile
                $houseRent = (float) ($profile->house_rent ?? 0);
                $medicalAllowance = (float) ($profile->medical_allowance ?? 0);
                $conveyanceAllowance = (float) ($profile->conveyance_allowance ?? 0);
                $overtimeHourlyRate = (float) ($profile->overtime_hourly_rate ?? 0);

                // Note: total_overtime_hours should be input during payroll generation/edit
                // For now, default to 0 - admin can edit later
                $totalOvertimeHours = 0;
                $overtimeAmount = $overtimeHourlyRate * $totalOvertimeHours;

                // Calculate gross salary (base + allowances + overtime)
                $grossSalary = $baseSalary + $houseRent + $medicalAllowance + $conveyanceAllowance + $overtimeAmount;

                Payroll::create([
                    'user_id' => $staff->id,
                    'month_year' => $month,
                    'basic_salary' => $baseSalary,
                    'house_rent' => $houseRent,
                    'medical_allowance' => $medicalAllowance,
                    'conveyance_allowance' => $conveyanceAllowance,
                    'overtime_hourly_rate' => $overtimeHourlyRate,
                    'total_overtime_hours' => $totalOvertimeHours,
                    'overtime_amount' => $overtimeAmount,
                    'bonus' => 0,
                    'deductions' => 0,
                    'net_payable' => $grossSalary, // Initially same as Gross (before bonus/deductions)
                    'status' => 'generated'
                ]);
                $count++;
            }

            DB::commit();

            $message = "Payroll generated for {$count} employees for month {$month}";
            if ($skipped > 0) {
                $message .= " ({$skipped} skipped - already have payroll or no salary)";
            }

            return $this->sendSuccess(null, $message);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * 3. Update Individual Payroll (Add Bonus/Deduction, Overtime Hours, Allowances)
     */
    public function update(Request $request, $id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.payroll.edit')) {
            return $this->sendError('You do not have permission to edit payroll.', null, 403);
        }

        $request->validate([
            'bonus' => 'numeric|min:0',
            'deductions' => 'numeric|min:0',
            'house_rent' => 'numeric|min:0',
            'medical_allowance' => 'numeric|min:0',
            'conveyance_allowance' => 'numeric|min:0',
            'total_overtime_hours' => 'numeric|min:0',
        ]);

        $payroll = Payroll::findOrFail($id);

        if ($payroll->status === 'paid') {
            return $this->sendError('Cannot update paid payroll.');
        }

        // Get values from request or fallback to existing values
        $bonus = (float) ($request->bonus ?? $payroll->bonus);
        $deductions = (float) ($request->deductions ?? $payroll->deductions);
        $houseRent = (float) ($request->house_rent ?? $payroll->house_rent);
        $medicalAllowance = (float) ($request->medical_allowance ?? $payroll->medical_allowance);
        $conveyanceAllowance = (float) ($request->conveyance_allowance ?? $payroll->conveyance_allowance);
        $totalOvertimeHours = (float) ($request->total_overtime_hours ?? $payroll->total_overtime_hours);

        // Recalculate overtime amount
        $overtimeAmount = (float) $payroll->overtime_hourly_rate * $totalOvertimeHours;

        // Calculate net payable: (basic + allowances + overtime + bonus) - deductions
        $netPayable = (float) $payroll->basic_salary
            + $houseRent
            + $medicalAllowance
            + $conveyanceAllowance
            + $overtimeAmount
            + $bonus
            - $deductions;

        $payroll->update([
            'house_rent' => $houseRent,
            'medical_allowance' => $medicalAllowance,
            'conveyance_allowance' => $conveyanceAllowance,
            'total_overtime_hours' => $totalOvertimeHours,
            'overtime_amount' => $overtimeAmount,
            'bonus' => $bonus,
            'deductions' => $deductions,
            'net_payable' => $netPayable
        ]);

        return $this->sendSuccess($payroll, 'Payroll adjusted successfully');
    }

    /**
     * 4. Make Payment & Accounting Entry
     * Industry Standard: Updates bank balance, creates transaction, journal entry, and marks expense as paid
     */
    public function pay(Request $request, $id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.payroll.process')) {
            return $this->sendError('You do not have permission to process payroll payments.', null, 403);
        }

        $request->validate([
            'bank_id' => 'required|exists:banks,id',
        ]);

        $payroll = Payroll::with('user.staffProfile')->findOrFail($id);

        if ($payroll->status === 'paid') {
            return $this->sendError('Already paid.');
        }

        // Get the selected bank
        $bank = Bank::findOrFail($request->bank_id);

        DB::beginTransaction();
        try {
            $amount = (float) $payroll->net_payable;
            $balanceBefore = (float) $bank->current_balance;
            $balanceAfter = $balanceBefore - $amount;

            // Validate sufficient balance
            if ($balanceAfter < 0) {
                DB::rollBack();
                return $this->sendError('Insufficient bank balance. Current balance: ' . number_format($balanceBefore, 2));
            }

            // 1. Update Payroll Status
            $payroll->update([
                'status' => 'paid',
                'payment_date' => now()
            ]);

            // 2. Update Bank Balance
            $bank->update([
                'current_balance' => $balanceAfter
            ]);

            // Get Salary Expense Account (used for both expense record and journal entry)
            $expenseAcc = ChartOfAccount::where('code', '5003')->first(); // Salary Expense

            // 3. Create Bank Transaction (for transaction history and recent transactions)
            $bankTransaction = BankTransaction::create([
                'bank_id' => $bank->id,
                'type' => 'withdrawal', // Salary payment is a withdrawal from bank
                'amount' => $amount,
                'balance_before' => $balanceBefore,
                'balance_after' => $balanceAfter,
                'reference_number' => 'SAL-' . $payroll->month_year . '-' . $payroll->id,
                'description' => "Salary Payment to {$payroll->user->name} for {$payroll->month_year}",
                'transaction_date' => now(),
                'transactionable_type' => Payroll::class,
                'transactionable_id' => $payroll->id,
                'created_by' => auth()->id() ?? 1
            ]);

            // 4. Create Expense Record (Industry Standard - Salary is an operational expense)
            $expense = Expense::create([
                'title' => "Salary - {$payroll->user->name} ({$payroll->month_year})",
                'amount' => $amount,
                'expense_date' => now(),
                'account_id' => $expenseAcc->id ?? null, // Salary Expense account
                'payment_account_id' => $bank->chart_of_account_id, // Bank account paid from
                'paid_by' => auth()->id() ?? $payroll->user_id, // User who processed payment
                'reference_number' => 'SAL-' . $payroll->month_year . '-' . $payroll->id,
                'notes' => "Salary payment for {$payroll->month_year}. " .
                         "Basic: {$payroll->basic_salary}, " .
                         "House Rent: {$payroll->house_rent}, " .
                         "Medical: {$payroll->medical_allowance}, " .
                         "Conveyance: {$payroll->conveyance_allowance}, " .
                         "Overtime: {$payroll->overtime_amount}, " .
                         "Bonus: {$payroll->bonus}, " .
                         "Deductions: {$payroll->deductions}",
                'is_approved' => true, // Auto-approve since payment is processed
                'expense_department_id' => $payroll->user->staffProfile->department_id ?? null,
                'source_type' => Payroll::class, // Link to payroll for reference
                'source_id' => $payroll->id,
                'created_by' => auth()->id() ?? 1
            ]);

            // 5. Accounting Journal Entry (Double-Entry)
            // Debit: Salary Expense (5003), Credit: Bank's chart_of_account_id
            if ($expenseAcc && $bank->chart_of_account_id) {
                $creditAcc = ChartOfAccount::find($bank->chart_of_account_id);

                if (!$creditAcc) {
                    DB::rollBack();
                    return $this->sendError('Bank account is not linked to a chart of account.');
                }

                $je = JournalEntry::create([
                    'entry_number' => 'SAL-' . $payroll->month_year . '-' . $payroll->id,
                    'date' => now(),
                    'description' => "Salary Payment to {$payroll->user->name} for {$payroll->month_year} (via {$bank->name})",
                    'reference_type' => Payroll::class,
                    'reference_id' => $payroll->id,
                    'created_by' => auth()->id() ?? 1
                ]);

                // Debit Salary Expense
                JournalItem::create([
                    'journal_entry_id' => $je->id,
                    'account_id' => $expenseAcc->id,
                    'debit' => $amount,
                    'credit' => 0
                ]);

                // Credit Bank Account (reduces bank balance in books)
                JournalItem::create([
                    'journal_entry_id' => $je->id,
                    'account_id' => $creditAcc->id,
                    'debit' => 0,
                    'credit' => $amount
                ]);

                // Link bank transaction to journal entry
                $bankTransaction->update(['journal_entry_id' => $je->id]);

                // Validate balance (critical for double-entry)
                $totalDebit = $je->items()->sum('debit');
                $totalCredit = $je->items()->sum('credit');
                if ($totalDebit != $totalCredit) {
                    DB::rollBack();
                    return $this->sendError('Journal entry is not balanced. Debit: ' . $totalDebit . ', Credit: ' . $totalCredit);
                }
            }

            DB::commit();
            return $this->sendSuccess([
                'payroll' => $payroll->load('user'),
                'bank_transaction' => $bankTransaction,
                'expense' => $expense,
                'new_balance' => $balanceAfter
            ], 'Salary paid successfully. Bank balance updated, expense created.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * 5. Generate Salary Sheet (mark as processing & return bank letter data)
     * POST /api/v2/hrm/payrolls/process-sheet
     */
    public function processSalarySheet(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.payroll.process')) {
            return $this->sendError('You do not have permission to process payroll.', null, 403);
        }

        $request->validate([
            'bank_id' => 'required|exists:banks,id',
            'month_year' => 'required|date_format:Y-m',
            'company_name' => 'required|string',
            'account_number' => 'nullable|string',
            'proprietor_name' => 'required|string',
        ]);

        $monthYear = $request->month_year;
        $bankId = $request->bank_id;
        $companyName = $request->company_name;
        $proprietorName = $request->proprietor_name;

        // Get bank details for the letter
        $bank = Bank::findOrFail($bankId);

        // Use account number from request, or fall back to bank's account number
        $accountNumber = $request->account_number ?? $bank->account_number;

        // Get pending payrolls for the month (generated or processing)
        $payrolls = Payroll::with(['user.staffProfile', 'user'])
            ->where('month_year', $monthYear)
            ->whereIn('status', ['generated', 'processing'])
            ->get();

        if ($payrolls->isEmpty()) {
            return $this->sendError('No pending payroll found for ' . $monthYear . '. Please generate payroll first.');
        }

        DB::beginTransaction();
        try {
            $totalAmount = 0;

            // Mark all as processing and collect data for bank letter
            $salarySheetData = [];
            foreach ($payrolls as $payroll) {
                $payroll->update(['status' => 'processing']);
                $totalAmount += (float) $payroll->net_payable;

                $salarySheetData[] = [
                    'employee_name' => $payroll->user->name,
                    'account_name' => $payroll->user->staffProfile->bank_account_name ?? $payroll->user->name,
                    'account_number' => $payroll->user->staffProfile->bank_account_number ?? 'N/A',
                    'amount' => (float) $payroll->net_payable,
                    'remark' => $payroll->month_year,
                ];
            }

            // Store salary sheet info for later payment
            // You could create a separate table for this, but for now we'll use a session or just return the data

            DB::commit();

            // Convert amount to words
            $amountInWords = $this->convertNumberToWords($totalAmount);

            // Parse month year for letter
            $dateObj = \DateTime::createFromFormat('Y-m', $monthYear);
            $monthName = $dateObj->format('F');
            $year = $dateObj->format('Y');

            // Get payroll IDs as a plain array, not a collection
            $payrollIdsArray = $payrolls->pluck('id')->map(function ($id) {
                return (int) $id;
            })->toArray();

            // Build response WITHOUT any model objects
            $responseData = [
                'payroll_ids' => $payrollIdsArray,
                'total_amount' => $totalAmount,
                'amount_in_words' => $amountInWords,
                'employee_count' => $payrolls->count(),
                'bank_letter' => [
                    'date' => date('d/m/Y'),
                    'company_name' => $companyName,
                    'company_account_number' => $accountNumber ?? '',
                    'bank_name' => $bank->name,
                    'branch_name' => $bank->branch ?? 'Main Branch',
                    'month_year' => $monthYear,
                    'month_name' => $monthName,
                    'year' => $year,
                    'employees' => $salarySheetData,
                    'proprietor_name' => $proprietorName,
                    'total_amount' => $totalAmount,
                ]
            ];

            return $this->sendSuccess($responseData, 'Salary sheet generated successfully. Bank transfer letter ready.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
        }
    }

    /**
     * 6. Confirm Salary Payment (after bank confirms)
     * POST /api/v2/hrm/payrolls/confirm-payment
     * This creates all the accounting entries when bank confirms the transfer
     */
    public function confirmPayment(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.payroll.process')) {
            return $this->sendError('You do not have permission to confirm payments.', null, 403);
        }

        $request->validate([
            'payroll_ids' => 'required|array',
            'payroll_ids.*' => 'exists:payrolls,id',
            'bank_id' => 'required|exists:banks,id',
        ]);

        $payrollIds = $request->payroll_ids;
        $bank = Bank::findOrFail($request->bank_id);

        // Check if bank has a chart_of_account_id
        if (!$bank->chart_of_account_id) {
            return $this->sendError('The selected bank account is not linked to a Chart of Account. Please configure it first.');
        }

        // Eager load all relationships to avoid N+1 and potential errors
        $payrolls = Payroll::with(['user.staffProfile.department'])
            ->whereIn('id', $payrollIds)
            ->get();

        DB::beginTransaction();
        try {
            $results = [];
            $balanceBefore = (float) $bank->current_balance;
            $currentBalance = $balanceBefore;

            // Get Salary Expense Account (or create if not exists)
            $expenseAcc = ChartOfAccount::where('code', '5003')->first();
            if (!$expenseAcc) {
                return $this->sendError('Salary Expense Account (code: 5003) not found in Chart of Accounts. Please create it first.');
            }

            // Get credit account (bank's chart of account)
            $creditAcc = ChartOfAccount::where('id', $bank->chart_of_account_id)->first();
            if (!$creditAcc) {
                return $this->sendError('The linked Chart of Account for this bank was not found. Account ID: ' . $bank->chart_of_account_id);
            }

            // Verify the credit account has all required fields
            if (!$creditAcc->type) {
                return $this->sendError('The linked Chart of Account is missing required fields (type).');
            }

            foreach ($payrolls as $payroll) {
                // Only process if in 'processing' status
                if ($payroll->status !== 'processing') {
                    continue;
                }

                $amount = (float) $payroll->net_payable;

                // Update Payroll Status to paid
                $payroll->update([
                    'status' => 'paid',
                    'payment_date' => now()
                ]);

                // Update bank balance
                $currentBalance = $currentBalance - $amount;

                // Create Bank Transaction
                $bankTransaction = BankTransaction::create([
                    'bank_id' => $bank->id,
                    'type' => 'withdrawal',
                    'amount' => $amount,
                    'balance_before' => $balanceBefore,
                    'balance_after' => $currentBalance,
                    'reference_number' => 'SAL-' . $payroll->month_year . '-' . $payroll->id,
                    'description' => "Salary Payment to {$payroll->user->name} for {$payroll->month_year}",
                    'transaction_date' => now(),
                    'transactionable_type' => Payroll::class,
                    'transactionable_id' => $payroll->id,
                    'created_by' => auth()->id() ?? 1
                ]);

                // Create Expense Record - only if we have valid chart of accounts
                if ($expenseAcc && $creditAcc) {
                    Expense::create([
                        'title' => "Salary - {$payroll->user->name} ({$payroll->month_year})",
                        'amount' => $amount,
                        'expense_date' => now(),
                        'account_id' => $expenseAcc->id,
                        'payment_account_id' => $creditAcc->id,
                        'paid_by' => auth()->id() ?? $payroll->user_id,
                        'reference_number' => 'SAL-' . $payroll->month_year . '-' . $payroll->id,
                        'notes' => "Salary payment for {$payroll->month_year}. " .
                                 "Basic: {$payroll->basic_salary}, " .
                                 "House Rent: {$payroll->house_rent}, " .
                                 "Medical: {$payroll->medical_allowance}, " .
                                 "Conveyance: {$payroll->conveyance_allowance}, " .
                                 "Overtime: {$payroll->overtime_amount}, " .
                                 "Bonus: {$payroll->bonus}, " .
                                 "Deductions: {$payroll->deductions}",
                        'is_approved' => true,
                        'expense_department_id' => $payroll->user->staffProfile->department_id ?? null,
                        'source_type' => Payroll::class,
                        'source_id' => $payroll->id,
                        'created_by' => auth()->id() ?? 1
                    ]);
                }

                // Create Journal Entry (Double-Entry)
                $je = JournalEntry::create([
                    'entry_number' => 'SAL-' . $payroll->month_year . '-' . $payroll->id,
                    'date' => now(),
                    'description' => "Salary Payment to {$payroll->user->name} for {$payroll->month_year} (via {$bank->name})",
                    'reference_type' => Payroll::class,
                    'reference_id' => $payroll->id,
                    'created_by' => auth()->id() ?? 1
                ]);

                // Debit Salary Expense
                JournalItem::create([
                    'journal_entry_id' => $je->id,
                    'account_id' => $expenseAcc->id,
                    'debit' => $amount,
                    'credit' => 0
                ]);

                // Credit Bank Account
                JournalItem::create([
                    'journal_entry_id' => $je->id,
                    'account_id' => $creditAcc->id,
                    'debit' => 0,
                    'credit' => $amount
                ]);

                // Link bank transaction to journal entry
                $bankTransaction->update(['journal_entry_id' => $je->id]);

                $results[] = [
                    'payroll_id' => $payroll->id,
                    'employee' => $payroll->user->name,
                    'amount' => $amount,
                ];

                $balanceBefore = $currentBalance;
            }

            // Update final bank balance
            $bank->update([
                'current_balance' => $currentBalance
            ]);

            DB::commit();

            $totalAmount = $payrolls->sum('net_payable');
            return $this->sendSuccess([
                'paid_count' => count($results),
                'total_amount' => $totalAmount,
                'new_balance' => $currentBalance,
                'payrolls' => $results
            ], "Successfully confirmed payment for " . count($results) . " salaries. Total: " . number_format($totalAmount, 2) . " ৳");

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * Helper: Convert number to words (Bangla/English)
     */
    private function convertNumberToWords($number)
    {
        // Handle large numbers properly
        $ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
            'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        $tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

        if ($number == 0) return 'Zero';

        $words = [];
        $num = (int) $number;

        // Helper function to convert a number less than 1000
        $convertHundreds = function($n) use ($ones, $tens) {
            if ($n == 0) return '';
            $result = '';

            if ($n >= 100) {
                $hundreds = floor($n / 100);
                $result .= $ones[$hundreds] . ' Hundred';
                $n %= 100;
                if ($n > 0) $result .= ' ';
            }

            if ($n > 0) {
                if ($n < 20) {
                    $result .= $ones[$n];
                } else {
                    $tenPart = floor($n / 10);
                    $onesPart = $n % 10;
                    $result .= $tens[$tenPart];
                    if ($onesPart > 0) {
                        $result .= ' ' . $ones[$onesPart];
                    }
                }
            }
            return $result;
        };

        // Crores (10 million)
        if ($num >= 10000000) {
            $crores = floor($num / 10000000);
            $words[] = $convertHundreds($crores) . ' Crore';
            $num %= 10000000;
        }

        // Lakhs (100 thousand)
        if ($num >= 100000) {
            $lakhs = floor($num / 100000);
            $words[] = $convertHundreds($lakhs) . ' Lac';
            $num %= 100000;
        }

        // Thousands
        if ($num >= 1000) {
            $thousands = floor($num / 1000);
            $words[] = $convertHundreds($thousands) . ' Thousand';
            $num %= 1000;
        }

        // Less than 1000
        if ($num > 0) {
            $words[] = $convertHundreds($num);
        }

        return implode(' ', array_filter($words, function($w) { return $w !== ''; })) . ' Taka Only';
    }
}