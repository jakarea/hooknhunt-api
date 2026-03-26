<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\VendorBill;
use App\Models\VendorBillItem;
use App\Models\VendorPayment;
use App\Models\VendorPaymentBill;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AccountsPayableController extends Controller
{
    use ApiResponse;

    /**
     * Get all vendor bills (Accounts Payable)
     */
    public function index(Request $request): JsonResponse
    {
        // Permission check - super_admin bypasses this check
        if (!auth()->user()->hasPermissionTo('finance.accounts_payable.view')) {
            return response()->json([
                'status' => false,
                'message' => 'You do not have permission to view accounts payable.',
            ], 403);
        }

        $query = VendorBill::with(['supplier', 'chartAccount', 'items', 'creator']);

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by payment status
        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        // Filter by supplier
        if ($request->supplier_id) {
            $query->where('supplier_id', $request->supplier_id);
        }

        // Filter by date range
        if ($request->start_date && $request->end_date) {
            $query->whereBetween('bill_date', [$request->start_date, $request->end_date]);
        }

        // Search by bill number or notes
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('bill_number', 'like', '%' . $request->search . '%')
                  ->orWhere('notes', 'like', '%' . $request->search . '%');
            });
        }

        // Order by date descending
        $query->orderBy('bill_date', 'desc')->orderBy('created_at', 'desc');

        $bills = $query->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => $bills,
        ]);
    }

    /**
     * Get single vendor bill
     */
    public function show(int $id): JsonResponse
    {
        $bill = VendorBill::with(['supplier', 'chartAccount', 'items.chartAccount', 'creator', 'payments.vendorPayment'])
            ->find($id);

        if (!$bill) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found',
            ], 404);
        }

        $bill->supplier_name = $bill->supplier->name ?? null;
        $bill->account_name = $bill->chartAccount->name ?? null;

        return response()->json([
            'success' => true,
            'data' => $bill,
        ]);
    }

    /**
     * Create new vendor bill
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'bill_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:bill_date',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.tax_rate' => 'nullable|numeric|min:0|max:100',
            'items.*.discount_amount' => 'nullable|numeric|min:0',
            'items.*.chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $billNumber = VendorBill::generateBillNumber();

            // Calculate totals
            $subtotal = 0;
            $totalTax = 0;
            $totalDiscount = 0;

            foreach ($validated['items'] as $item) {
                $lineTotal = $item['quantity'] * $item['unit_price'];
                $taxAmount = $lineTotal * (($item['tax_rate'] ?? 0) / 100);
                $itemDiscount = $item['discount_amount'] ?? 0;

                $subtotal += $lineTotal;
                $totalTax += $taxAmount;
                $totalDiscount += $itemDiscount;
            }

            $totalAmount = $subtotal + $totalTax - $totalDiscount;

            $bill = VendorBill::create([
                'bill_number' => $billNumber,
                'supplier_id' => $validated['supplier_id'],
                'chart_account_id' => $validated['chart_account_id'] ?? null,
                'bill_date' => $validated['bill_date'],
                'due_date' => $validated['due_date'],
                'subtotal' => $subtotal,
                'tax_amount' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'balance_due' => $totalAmount,
                'status' => 'open',
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            // Create bill items
            foreach ($validated['items'] as $itemData) {
                $item = new VendorBillItem([
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => $itemData['tax_rate'] ?? 0,
                    'discount_amount' => $itemData['discount_amount'] ?? 0,
                    'chart_account_id' => $itemData['chart_account_id'] ?? null,
                ]);
                $item->vendorBill()->associate($bill);
                $item->calculateTotal();
                $item->save();
            }

            $bill->load('supplier', 'items');

            return response()->json([
                'success' => true,
                'message' => 'Bill created successfully',
                'data' => $bill,
            ], 201);
        });
    }

    /**
     * Update vendor bill
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $bill = VendorBill::find($id);

        if (!$bill) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found',
            ], 404);
        }

        // Can only update draft or open bills
        if (!in_array($bill->status, ['draft', 'open'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update bill that is already paid or partially paid',
            ], 400);
        }

        $validated = $request->validate([
            'supplier_id' => 'sometimes|exists:suppliers,id',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'bill_date' => 'sometimes|date',
            'due_date' => 'sometimes|date|after_or_equal:bill_date',
            'notes' => 'nullable|string',
        ]);

        $bill->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Bill updated successfully',
            'data' => $bill->fresh(),
        ]);
    }

    /**
     * Delete vendor bill
     */
    public function destroy(int $id): JsonResponse
    {
        $bill = VendorBill::find($id);

        if (!$bill) {
            return response()->json([
                'success' => false,
                'message' => 'Bill not found',
            ], 404);
        }

        // Can only delete draft or open bills with no payments
        if (!in_array($bill->status, ['draft', 'open'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete bill with existing payments',
            ], 400);
        }

        $bill->delete();

        return response()->json([
            'success' => true,
            'message' => 'Bill deleted successfully',
        ]);
    }

    /**
     * Get aging report
     */
    public function agingReport(Request $request): JsonResponse
    {
        $asOfDate = $request->as_of_date ?? now()->toDateString();

        $bills = VendorBill::with('supplier')
            ->where('payment_status', '!=', 'paid')
            ->where('bill_date', '<=', $asOfDate)
            ->get();

        $aging = [
            'current' => ['count' => 0, 'amount' => 0],
            '1_30_days' => ['count' => 0, 'amount' => 0],
            '31_60_days' => ['count' => 0, 'amount' => 0],
            '61_90_days' => ['count' => 0, 'amount' => 0],
            'over_90_days' => ['count' => 0, 'amount' => 0],
        ];

        $bySupplier = [];

        foreach ($bills as $bill) {
            $daysOverdue = max(0, now()->diffInDays($bill->due_date));

            if ($daysOverdue == 0) {
                $aging['current']['count']++;
                $aging['current']['amount'] += $bill->balance_due;
                $bucket = 'current';
            } elseif ($daysOverdue <= 30) {
                $aging['1_30_days']['count']++;
                $aging['1_30_days']['amount'] += $bill->balance_due;
                $bucket = '1_30_days';
            } elseif ($daysOverdue <= 60) {
                $aging['31_60_days']['count']++;
                $aging['31_60_days']['amount'] += $bill->balance_due;
                $bucket = '31_60_days';
            } elseif ($daysOverdue <= 90) {
                $aging['61_90_days']['count']++;
                $aging['61_90_days']['amount'] += $bill->balance_due;
                $bucket = '61_90_days';
            } else {
                $aging['over_90_days']['count']++;
                $aging['over_90_days']['amount'] += $bill->balance_due;
                $bucket = 'over_90_days';
            }

            // Group by supplier
            $supplierId = $bill->supplier_id;
            if (!isset($bySupplier[$supplierId])) {
                $bySupplier[$supplierId] = [
                    'supplier_id' => $supplierId,
                    'supplier_name' => $bill->supplier->name ?? 'Unknown',
                    'total_due' => 0,
                    'current' => 0,
                    '1_30_days' => 0,
                    '31_60_days' => 0,
                    '61_90_days' => 0,
                    'over_90_days' => 0,
                ];
            }

            $bySupplier[$supplierId]['total_due'] += $bill->balance_due;
            $bySupplier[$supplierId][$bucket] += $bill->balance_due;
        }

        $totalDue = $bills->sum('balance_due');

        return response()->json([
            'success' => true,
            'data' => [
                'as_of_date' => $asOfDate,
                'total_due' => $totalDue,
                'aging' => $aging,
                'by_supplier' => array_values($bySupplier),
                'total_unpaid_bills' => $bills->count(),
            ],
        ]);
    }

    /**
     * Get payments
     */
    public function payments(Request $request): JsonResponse
    {
        $query = VendorPayment::with(['supplier', 'chartAccount', 'creator']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->supplier_id) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->start_date && $request->end_date) {
            $query->whereBetween('payment_date', [$request->start_date, $request->end_date]);
        }

        $payments = $query->orderBy('payment_date', 'desc')
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => $payments,
        ]);
    }

    /**
     * Create payment
     */
    public function storePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,bank_transfer,cheque,card',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'bills' => 'required|array',
            'bills.*.bill_id' => 'required|exists:vendor_bills,id',
            'bills.*.amount_applied' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $totalApplied = collect($validated['bills'])->sum('amount_applied');

            if ($totalApplied > $validated['amount']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total amount applied cannot exceed payment amount',
                ], 400);
            }

            $payment = VendorPayment::create([
                'payment_number' => VendorPayment::generatePaymentNumber(),
                'supplier_id' => $validated['supplier_id'],
                'chart_account_id' => $validated['chart_account_id'] ?? null,
                'payment_date' => $validated['payment_date'],
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'completed',
                'created_by' => auth()->id(),
            ]);

            // Apply payment to bills
            foreach ($validated['bills'] as $billData) {
                $bill = VendorBill::find($billData['bill_id']);

                VendorPaymentBill::create([
                    'vendor_payment_id' => $payment->id,
                    'vendor_bill_id' => $bill->id,
                    'amount_applied' => $billData['amount_applied'],
                ]);

                // Update bill
                $bill->updatePaidAmount($billData['amount_applied']);
            }

            $payment->load('supplier', 'bills');

            return response()->json([
                'success' => true,
                'message' => 'Payment created and applied successfully',
                'data' => $payment,
            ], 201);
        });
    }

    /**
     * Get statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = [
            'total_bills' => VendorBill::count(),
            'unpaid_bills' => VendorBill::unpaid()->count(),
            'partial_bills' => VendorBill::partial()->count(),
            'paid_bills' => VendorBill::paid()->count(),
            'overdue_bills' => VendorBill::overdue()->count(),
            'total_due' => VendorBill::unpaid()->sum('balance_due'),
            'total_paid_this_month' => VendorPayment::completed()
                ->whereMonth('payment_date', now()->month)
                ->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
