<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\CustomerInvoice;
use App\Models\CustomerInvoiceItem;
use App\Models\CustomerPayment;
use App\Models\CustomerPaymentInvoice;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AccountsReceivableController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CustomerInvoice::with(['customer', 'chartAccount', 'items', 'creator']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->payment_status) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->customer_id) {
            $query->where('customer_id', $request->customer_id);
        }

        if ($request->start_date && $request->end_date) {
            $query->whereBetween('invoice_date', [$request->start_date, $request->end_date]);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('invoice_number', 'like', '%' . $request->search . '%')
                  ->orWhere('notes', 'like', '%' . $request->search . '%');
            });
        }

        $query->orderBy('invoice_date', 'desc')->orderBy('created_at', 'desc');

        $invoices = $query->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => $invoices,
        ]);
    }

    public function show(int $id): JsonResponse
    {
        $invoice = CustomerInvoice::with(['customer', 'chartAccount', 'items.chartAccount', 'creator', 'payments.customerPayment'])
            ->find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found',
            ], 404);
        }

        $invoice->customer_name = $invoice->customer->name ?? null;
        $invoice->account_name = $invoice->chartAccount->name ?? null;

        return response()->json([
            'success' => true,
            'data' => $invoice,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'invoice_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:invoice_date',
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
            $invoiceNumber = CustomerInvoice::generateInvoiceNumber();

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

            $invoice = CustomerInvoice::create([
                'invoice_number' => $invoiceNumber,
                'customer_id' => $validated['customer_id'],
                'chart_account_id' => $validated['chart_account_id'] ?? null,
                'invoice_date' => $validated['invoice_date'],
                'due_date' => $validated['due_date'],
                'subtotal' => $subtotal,
                'tax_amount' => $totalTax,
                'discount_amount' => $totalDiscount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'balance_due' => $totalAmount,
                'status' => 'sent',
                'payment_status' => 'unpaid',
                'notes' => $validated['notes'] ?? null,
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['items'] as $itemData) {
                $item = new CustomerInvoiceItem([
                    'description' => $itemData['description'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'tax_rate' => $itemData['tax_rate'] ?? 0,
                    'discount_amount' => $itemData['discount_amount'] ?? 0,
                    'chart_account_id' => $itemData['chart_account_id'] ?? null,
                ]);
                $item->customerInvoice()->associate($invoice);
                $item->calculateTotal();
                $item->save();
            }

            $invoice->load('customer', 'items');

            return response()->json([
                'success' => true,
                'message' => 'Invoice created successfully',
                'data' => $invoice,
            ], 201);
        });
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $invoice = CustomerInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found',
            ], 404);
        }

        if (!in_array($invoice->status, ['draft', 'sent'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot update invoice that is already paid or partially paid',
            ], 400);
        }

        $validated = $request->validate([
            'customer_id' => 'sometimes|exists:customers,id',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'invoice_date' => 'sometimes|date',
            'due_date' => 'sometimes|date|after_or_equal:invoice_date',
            'notes' => 'nullable|string',
        ]);

        $invoice->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Invoice updated successfully',
            'data' => $invoice->fresh(),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $invoice = CustomerInvoice::find($id);

        if (!$invoice) {
            return response()->json([
                'success' => false,
                'message' => 'Invoice not found',
            ], 404);
        }

        if (!in_array($invoice->status, ['draft', 'sent'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete invoice with existing payments',
            ], 400);
        }

        $invoice->delete();

        return response()->json([
            'success' => true,
            'message' => 'Invoice deleted successfully',
        ]);
    }

    public function agingReport(Request $request): JsonResponse
    {
        $asOfDate = $request->as_of_date ?? now()->toDateString();

        $invoices = CustomerInvoice::with('customer')
            ->where('payment_status', '!=', 'paid')
            ->where('invoice_date', '<=', $asOfDate)
            ->get();

        $aging = [
            'current' => ['count' => 0, 'amount' => 0],
            '1_30_days' => ['count' => 0, 'amount' => 0],
            '31_60_days' => ['count' => 0, 'amount' => 0],
            '61_90_days' => ['count' => 0, 'amount' => 0],
            'over_90_days' => ['count' => 0, 'amount' => 0],
        ];

        $byCustomer = [];

        foreach ($invoices as $invoice) {
            $daysOverdue = max(0, now()->diffInDays($invoice->due_date));

            if ($daysOverdue == 0) {
                $aging['current']['count']++;
                $aging['current']['amount'] += $invoice->balance_due;
                $bucket = 'current';
            } elseif ($daysOverdue <= 30) {
                $aging['1_30_days']['count']++;
                $aging['1_30_days']['amount'] += $invoice->balance_due;
                $bucket = '1_30_days';
            } elseif ($daysOverdue <= 60) {
                $aging['31_60_days']['count']++;
                $aging['31_60_days']['amount'] += $invoice->balance_due;
                $bucket = '31_60_days';
            } elseif ($daysOverdue <= 90) {
                $aging['61_90_days']['count']++;
                $aging['61_90_days']['amount'] += $invoice->balance_due;
                $bucket = '61_90_days';
            } else {
                $aging['over_90_days']['count']++;
                $aging['over_90_days']['amount'] += $invoice->balance_due;
                $bucket = 'over_90_days';
            }

            $customerId = $invoice->customer_id;
            if (!isset($byCustomer[$customerId])) {
                $byCustomer[$customerId] = [
                    'customer_id' => $customerId,
                    'customer_name' => $invoice->customer->name ?? 'Unknown',
                    'total_due' => 0,
                    'current' => 0,
                    '1_30_days' => 0,
                    '31_60_days' => 0,
                    '61_90_days' => 0,
                    'over_90_days' => 0,
                ];
            }

            $byCustomer[$customerId]['total_due'] += $invoice->balance_due;
            $byCustomer[$customerId][$bucket] += $invoice->balance_due;
        }

        $totalDue = $invoices->sum('balance_due');

        return response()->json([
            'success' => true,
            'data' => [
                'as_of_date' => $asOfDate,
                'total_due' => $totalDue,
                'aging' => $aging,
                'by_customer' => array_values($byCustomer),
                'total_unpaid_invoices' => $invoices->count(),
            ],
        ]);
    }

    public function payments(Request $request): JsonResponse
    {
        $query = CustomerPayment::with(['customer', 'chartAccount', 'creator']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->customer_id) {
            $query->where('customer_id', $request->customer_id);
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

    public function storePayment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'payment_date' => 'required|date',
            'amount' => 'required|numeric|min:0',
            'payment_method' => 'required|in:cash,bank_transfer,cheque,card,mobile',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'invoices' => 'required|array',
            'invoices.*.invoice_id' => 'required|exists:customer_invoices,id',
            'invoices.*.amount_applied' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $totalApplied = collect($validated['invoices'])->sum('amount_applied');

            if ($totalApplied > $validated['amount']) {
                return response()->json([
                    'success' => false,
                    'message' => 'Total amount applied cannot exceed payment amount',
                ], 400);
            }

            $payment = CustomerPayment::create([
                'payment_number' => CustomerPayment::generatePaymentNumber(),
                'customer_id' => $validated['customer_id'],
                'chart_account_id' => $validated['chart_account_id'] ?? null,
                'payment_date' => $validated['payment_date'],
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'completed',
                'created_by' => auth()->id(),
            ]);

            foreach ($validated['invoices'] as $invoiceData) {
                $invoice = CustomerInvoice::find($invoiceData['invoice_id']);

                CustomerPaymentInvoice::create([
                    'customer_payment_id' => $payment->id,
                    'customer_invoice_id' => $invoice->id,
                    'amount_applied' => $invoiceData['amount_applied'],
                ]);

                $invoice->updatePaidAmount($invoiceData['amount_applied']);
            }

            $payment->load('customer', 'invoices');

            return response()->json([
                'success' => true,
                'message' => 'Payment created and applied successfully',
                'data' => $payment,
            ], 201);
        });
    }

    public function statistics(): JsonResponse
    {
        $stats = [
            'total_invoices' => CustomerInvoice::count(),
            'unpaid_invoices' => CustomerInvoice::unpaid()->count(),
            'partial_invoices' => CustomerInvoice::partial()->count(),
            'paid_invoices' => CustomerInvoice::paid()->count(),
            'overdue_invoices' => CustomerInvoice::overdue()->count(),
            'total_due' => CustomerInvoice::unpaid()->sum('balance_due'),
            'total_collected_this_month' => CustomerPayment::completed()
                ->whereMonth('payment_date', now()->month)
                ->sum('amount'),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
