<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\Supplier;
use App\Models\Bank;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\SupplierLedger;
use Exception;

/**
 * Purchase Order Payment Service
 *
 * Pure functions for purchase order payment calculations and processing.
 * Each function has single responsibility and no side effects.
 *
 * Business Logic:
 * 1. Calculate payment breakdown (supplier credit vs bank)
 * 2. Validate payment (allows overdraft)
 * 3. Process payment in transaction:
 *    - Deduct supplier credit first
 *    - Deduct from bank account
 *    - Create journal entry (double-entry)
 *    - Record supplier ledger entry
 */
class PurchaseOrderPaymentService
{
    /**
     * Calculate payment breakdown from supplier credit and bank
     *
     * @param float $orderTotalBDT - Total order amount in BDT
     * @param float $supplierCreditBalance - Supplier's credit balance
     * @return array{from_supplier_credit: float, from_bank: float, total: float}
     */
    public static function calculatePaymentBreakdown(
        float $orderTotalBDT,
        float $supplierCreditBalance
    ): array {
        // Use supplier credit first, then bank for remainder
        $fromSupplierCredit = min($orderTotalBDT, max(0, $supplierCreditBalance));
        $fromBank = max(0, $orderTotalBDT - $fromSupplierCredit);

        return [
            'from_supplier_credit' => round($fromSupplierCredit, 2),
            'from_bank' => round($fromBank, 2),
            'total' => round($orderTotalBDT, 2),
        ];
    }

    /**
     * Calculate final bank balance after payment
     *
     * @param float $currentBalance - Current bank balance
     * @param float $paymentAmount - Amount to deduct
     * @return array{final_balance: float, is_negative: bool, difference: float}
     */
    public static function calculateFinalBankBalance(
        float $currentBalance,
        float $paymentAmount
    ): array {
        $finalBalance = $currentBalance - $paymentAmount;

        return [
            'final_balance' => round($finalBalance, 2),
            'is_negative' => $finalBalance < 0,
            'difference' => round($paymentAmount, 2),
        ];
    }

    /**
     * Validate if payment can be processed
     * (Allow negative balances - overdraft permitted)
     *
     * @param float $bankBalance
     * @param float $paymentAmount
     * @return array{can_proceed: bool, reason?: string}
     */
    public static function validatePayment(
        float $bankBalance,
        float $paymentAmount
    ): array {
        // Business rule: Allow overdraft (negative balances)
        // No validation needed - always proceed
        return [
            'can_proceed' => true,
        ];
    }

    /**
     * Generate payment description for journal entry
     *
     * @param string $poNumber
     * @param array $breakdown
     * @return string
     */
    public static function generatePaymentDescription(
        string $poNumber,
        array $breakdown
    ): string {
        $parts = ["Payment for {$poNumber}"];

        if ($breakdown['from_supplier_credit'] > 0) {
            $parts[] = "Used supplier credit: ৳" . number_format($breakdown['from_supplier_credit'], 2) . ' BDT';
        }

        if ($breakdown['from_bank'] > 0) {
            $parts[] .= "Paid from bank: ৳" . number_format($breakdown['from_bank'], 2) . ' BDT';
        }

        return implode(' - ', $parts);
    }

    /**
     * Process complete payment transaction
     *
     * NEW FLOW: Creates draft expenses for admin approval
     * 1. Creates expense for supplier credit deduction (if any)
     * 2. Creates expense for bank payment (if any)
     * 3. No immediate deduction - waits for admin approval
     *
     * @param PurchaseOrder $po
     * @param Bank $bank
     * @param array $breakdown
     * @param int $userId
     * @return array{wallet_expense: Expense|null, bank_expense: Expense|null}
     * @throws Exception
     */
    public static function processPayment(
        PurchaseOrder $po,
        Bank $bank,
        array $breakdown,
        int $userId
    ): array {
        return \DB::transaction(function () use ($po, $bank, $breakdown, $userId) {
            $expenses = [];

            // Step 1: Create expense for supplier credit deduction
            $walletExpense = null;
            if ($breakdown['from_supplier_credit'] > 0) {
                $walletExpense = \App\Models\Expense::create([
                    'title' => "PO-{$po->po_number} - Payment to {$po->supplier->name} from wallet",
                    'amount' => $breakdown['from_supplier_credit'],
                    'account_id' => 14, // Accounts Payable
                    'expense_date' => now(),
                    'reference_number' => $po->po_number,
                    'notes' => "Supplier wallet payment for PO {$po->po_number}. Supplier credit: ৳" . number_format($breakdown['from_supplier_credit'], 2) . ' BDT',
                    'is_approved' => false, // Pending approval
                    'payment_account_id' => null, // Wallet payment - no bank account
                    'paid_by' => $userId, // User who confirmed the order
                    'created_by' => $userId,
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $po->id,
                ]);

                $expenses['wallet_expense'] = $walletExpense;
            }

            // Step 2: Create expense for bank payment
            $bankExpense = null;
            if ($breakdown['from_bank'] > 0) {
                // Get chart of account for this bank
                if (!$bank->chart_of_account_id) {
                    throw new Exception("Bank account ({$bank->name}) is not linked to a chart of account");
                }

                $bankExpense = \App\Models\Expense::create([
                    'title' => "PO-{$po->po_number} - Payment to {$po->supplier->name} from {$bank->name}",
                    'amount' => $breakdown['from_bank'],
                    'account_id' => 14, // Accounts Payable
                    'expense_date' => now(),
                    'reference_number' => $po->po_number,
                    'notes' => "Bank payment for PO {$po->po_number}. Bank: {$bank->name}, Amount: ৳" . number_format($breakdown['from_bank'], 2) . ' BDT',
                    'is_approved' => false, // Pending approval
                    'payment_account_id' => $bank->chart_of_account_id,
                    'paid_by' => $userId, // User who confirmed the order
                    'created_by' => $userId,
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $po->id,
                ]);

                $expenses['bank_expense'] = $bankExpense;
            }

            return $expenses;
        });
    }

    /**
     * Create supplier ledger entry
     *
     * @param int $supplierId
     * @param string $type
     * @param float $amount
     * @param float $balance
     * @param string $transactionId
     * @param string $reason
     * @return SupplierLedger
     */
    private static function createSupplierLedgerEntry(
        int $supplierId,
        string $type,
        float $amount,
        float $balance,
        string $transactionId,
        string $reason
    ): SupplierLedger {
        return SupplierLedger::create([
            'supplier_id' => $supplierId,
            'type' => $type,
            'amount' => $amount,
            'balance' => $balance,
            'transaction_id' => $transactionId,
            'reason' => $reason,
        ]);
    }

    /**
     * Deduct from supplier wallet
     *
     * @param Supplier $supplier
     * @param float $amount
     * @param string $note
     * @return bool
     */
    public static function deductSupplierCredit(
        Supplier $supplier,
        float $amount,
        string $note
    ): bool {
        if ($amount <= 0) {
            return true; // Nothing to deduct
        }

        return $supplier->debitWallet($amount, $note);
    }

    /**
     * Deduct from bank account
     *
     * @param Bank $bank
     * @param float $amount
     * @return bool
     */
    public static function deductFromBank(
        Bank $bank,
        float $amount
    ): bool {
        if ($amount <= 0) {
            return true; // Nothing to deduct
        }

        $bank->current_balance = $bank->current_balance - $amount;
        return $bank->save();
    }
}
