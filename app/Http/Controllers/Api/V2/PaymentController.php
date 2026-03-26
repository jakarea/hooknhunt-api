<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Payment; // Make sure you have this model
use App\Models\SalesOrder;
use App\Models\JournalEntry;
use App\Models\JournalItem;
use App\Models\ChartOfAccount;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    use ApiResponse;

    /**
     * 1. Record Payment (Cash / Cheque / Bank)
     */
    public function store(Request $request)
    {
        $request->validate([
            'sales_order_id' => 'required|exists:sales_orders,id',
            'amount' => 'required|numeric|min:1',
            'payment_method' => 'required|in:cash,bank,cheque,bkash',
            // Cheque Validation
            'cheque_no' => 'required_if:payment_method,cheque',
            'bank_name' => 'required_if:payment_method,cheque',
            'cheque_date' => 'required_if:payment_method,cheque|date',
        ]);

        DB::beginTransaction();
        try {
            $payment = Payment::create([
                'sales_order_id' => $request->sales_order_id,
                'amount' => $request->amount,
                'payment_method' => $request->payment_method,
                'cheque_no' => $request->cheque_no,
                'bank_name' => $request->bank_name,
                'cheque_date' => $request->cheque_date,
                'status' => ($request->payment_method === 'cheque') ? 'pending' : 'cleared', // Cheque starts as pending
                'payment_date' => now(),
                'collected_by' => auth()->id()
            ]);

            // Update Order Payment Status (Only if not cheque, or policy decides)
            if ($request->payment_method !== 'cheque') {
                $order = SalesOrder::find($request->sales_order_id);
                $order->increment('paid_amount', $request->amount);
            }

            // Accounting Entry (Journal)
            // If Cheque: Debit "Cheque in Hand", Credit "Customer/Sales"
            // If Cash: Debit "Cash", Credit "Customer/Sales"
            
            // ... (Journal Logic skipped for brevity, similar to ExpenseController)

            DB::commit();
            return $this->sendSuccess($payment, 'Payment recorded.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Payment failed', ['error' => $e->getMessage()]);
        }
    }

    /**
     * 2. Reconcile Cheque (Mark as Cleared)
     */
    public function reconcileCheque(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:cleared,bounced',
            'clearing_date' => 'required|date'
        ]);

        $payment = Payment::findOrFail($id);

        if ($payment->payment_method !== 'cheque') {
            return $this->sendError('This is not a cheque payment.');
        }

        DB::beginTransaction();
        try {
            $payment->update([
                'status' => $request->status,
                'clearing_date' => $request->clearing_date
            ]);

            if ($request->status === 'cleared') {
                // A. Update Order Paid Amount (Now money is real)
                $order = SalesOrder::find($payment->sales_order_id);
                $order->increment('paid_amount', $payment->amount);

                // B. Accounting Journal: 
                // Debit: Bank Account
                // Credit: Cheque In Hand Account
                
                // $this->createJournalEntry(...)
            } elseif ($request->status === 'bounced') {
                // Notify Customer & Admin
            }

            DB::commit();
            return $this->sendSuccess($payment, 'Cheque reconciled successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Reconciliation failed', ['error' => $e->getMessage()]);
        }
    }
}