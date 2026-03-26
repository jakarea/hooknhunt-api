<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\VatTaxLedger;
use App\Models\ChartOfAccount;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VatTaxLedgerController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of VAT/Tax ledger entries.
     * GET /api/v2/finance/vat-tax-ledgers
     */
    public function index(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.vat_tax.view')) {
            return $this->sendError('You do not have permission to view VAT/Tax ledgers.', null, 403);
        }

        $query = VatTaxLedger::with(['chartAccount', 'creator', 'updater']);

        // Filter by tax type
        if ($request->has('tax_type')) {
            $taxType = $request->tax_type;
            $query->where('tax_type', $taxType);
        }

        // Filter by direction
        if ($request->has('direction')) {
            $query->where('direction', $request->direction);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by fiscal year
        if ($request->has('fiscal_year')) {
            $query->where('fiscal_year', $request->fiscal_year);
        }

        // Filter by tax period
        if ($request->has('tax_period')) {
            $query->where('tax_period', $request->tax_period);
        }

        // Filter by transaction type
        if ($request->has('transaction_type')) {
            $query->where('transaction_type', $request->transaction_type);
        }

        // Filter by payment status
        if ($request->has('is_paid')) {
            $query->where('is_paid', $request->boolean('is_paid'));
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('notes', 'like', "%{$search}%")
                  ->orWhere('challan_number', 'like', "%{$search}%")
                  ->orWhere('payment_reference', 'like', "%{$search}%");
            });
        }

        $ledgers = $query->orderBy('transaction_date', 'desc')
                        ->orderBy('created_at', 'desc')
                        ->paginate($request->per_page ?? 15);

        return $this->sendSuccess($ledgers, 'VAT/Tax ledger entries retrieved successfully.');
    }

    /**
     * Store a newly created VAT/Tax ledger entry.
     * POST /api/v2/finance/vat-tax-ledgers
     */
    public function store(Request $request)
    {
        if (!auth()->user()->hasPermissionTo('finance.vat_tax.create')) {
            return $this->sendError('You do not have permission to create VAT/Tax entries.', null, 403);
        }

        $request->validate([
            'transaction_type' => 'required|in:purchase,sale,expense,adjustment',
            'tax_type' => 'required|in:vat,tax,ait',
            'base_amount' => 'required|numeric|min:0',
            'tax_rate' => 'required|numeric|min:0|max:100',
            'tax_amount' => 'required|numeric|min:0',
            'direction' => 'required|in:input,output',
            'flow_type' => 'required|in:debit,credit',
            'transaction_date' => 'required|date',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'fiscal_year' => 'nullable|string|max:10',
            'tax_period' => 'nullable|string|max:20',
            'challan_number' => 'nullable|string|max:255',
            'challan_date' => 'nullable|date',
            'reference_type' => 'nullable|string|max:255',
            'reference_id' => 'nullable|integer',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $ledger = VatTaxLedger::create([
                'transaction_type' => $request->transaction_type,
                'transaction_id' => $request->reference_id ?? 0, // Use reference_id as transaction_id
                'tax_type' => $request->tax_type,
                'base_amount' => $request->base_amount,
                'tax_rate' => $request->tax_rate,
                'tax_amount' => $request->tax_amount,
                'direction' => $request->direction,
                'flow_type' => $request->flow_type,
                'transaction_date' => $request->transaction_date,
                'chart_account_id' => $request->chart_account_id,
                'fiscal_year' => $request->fiscal_year,
                'tax_period' => $request->tax_period,
                'challan_number' => $request->challan_number,
                'challan_date' => $request->challan_date,
                'reference_type' => $request->reference_type,
                'reference_id' => $request->reference_id,
                'description' => $request->description,
                'notes' => $request->notes,
                'status' => 'pending',
                'is_paid' => false,
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return $this->sendSuccess($ledger->load('chartAccount'), 'VAT/Tax entry created successfully.', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create VAT/Tax entry.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified VAT/Tax ledger entry.
     * GET /api/v2/finance/vat-tax-ledgers/{id}
     */
    public function show($id)
    {
        if (!auth()->user()->hasPermissionTo('finance.vat_tax.view')) {
            return $this->sendError('You do not have permission to view VAT/Tax entries.', null, 403);
        }

        $ledger = VatTaxLedger::with(['chartAccount', 'creator', 'updater'])->findOrFail($id);

        // Add computed values
        $ledger->tax_type_label = $ledger->tax_type_label;
        $ledger->direction_label = $ledger->direction_label;
        $ledger->status_label = $ledger->status_label;
        $ledger->status_badge = $ledger->status_badge;

        return $this->sendSuccess($ledger, 'VAT/Tax entry retrieved successfully.');
    }

    /**
     * Update the specified VAT/Tax ledger entry.
     * PUT/PATCH /api/v2/finance/vat-tax-ledgers/{id}
     */
    public function update(Request $request, $id)
    {
        if (!auth()->user()->hasPermissionTo('finance.vat_tax.edit')) {
            return $this->sendError('You do not have permission to edit VAT/Tax entries.', null, 403);
        }

        $request->validate([
            'transaction_type' => 'sometimes|in:purchase,sale,expense,adjustment',
            'base_amount' => 'sometimes|numeric|min:0',
            'tax_rate' => 'sometimes|numeric|min:0|max:100',
            'tax_amount' => 'sometimes|numeric|min:0',
            'flow_type' => 'sometimes|in:debit,credit',
            'transaction_date' => 'sometimes|date',
            'chart_account_id' => 'nullable|exists:chart_of_accounts,id',
            'fiscal_year' => 'nullable|string|max:10',
            'tax_period' => 'nullable|string|max:20',
            'challan_number' => 'nullable|string|max:255',
            'challan_date' => 'nullable|date',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $ledger = VatTaxLedger::findOrFail($id);

        // Prevent modification if paid or filed
        if (in_array($ledger->status, ['filed', 'paid'])) {
            return $this->sendError('Cannot modify a ' . $ledger->status . ' entry.', null, 400);
        }

        DB::beginTransaction();
        try {
            $ledger->update($request->only([
                'transaction_type',
                'base_amount',
                'tax_rate',
                'tax_amount',
                'flow_type',
                'transaction_date',
                'chart_account_id',
                'fiscal_year',
                'tax_period',
                'challan_number',
                'challan_date',
                'description',
                'notes',
            ]));

            $ledger->updated_by = auth()->id();
            $ledger->save();

            DB::commit();
            return $this->sendSuccess($ledger->load('chartAccount'), 'VAT/Tax entry updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update VAT/Tax entry.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified VAT/Tax ledger entry.
     * DELETE /api/v2/finance/vat-tax-ledgers/{id}
     */
    public function destroy($id)
    {
        if (!auth()->user()->hasPermissionTo('finance.vat_tax.delete')) {
            return $this->sendError('You do not have permission to delete VAT/Tax entries.', null, 403);
        }

        $ledger = VatTaxLedger::findOrFail($id);

        // Prevent deletion if paid
        if ($ledger->is_paid) {
            return $this->sendError('Cannot delete a paid entry. It should be kept for records.', null, 400);
        }

        $ledger->delete();

        return $this->sendSuccess(null, 'VAT/Tax entry deleted successfully.');
    }

    /**
     * Mark VAT/Tax entry as filed.
     * POST /api/v2/finance/vat-tax-ledgers/{id}/mark-filed
     */
    public function markAsFiled(Request $request, $id)
    {
        $request->validate([
            'filing_date' => 'nullable|date',
            'acknowledgement_number' => 'nullable|string|max:255',
        ]);

        $ledger = VatTaxLedger::findOrFail($id);

        if ($ledger->status !== 'pending') {
            return $this->sendError('Can only mark pending entries as filed.', null, 400);
        }

        DB::beginTransaction();
        try {
            $ledger->markAsFiled();
            $ledger->updated_by = auth()->id();

            if ($request->has('filing_date')) {
                $ledger->filing_date = $request->filing_date;
            }

            if ($request->has('acknowledgement_number')) {
                $ledger->acknowledgement_number = $request->acknowledgement_number;
            }

            $ledger->save();

            DB::commit();
            return $this->sendSuccess($ledger->load('chartAccount'), 'Entry marked as filed successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to mark entry as filed.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Mark VAT/Tax entry as paid.
     * POST /api/v2/finance/vat-tax-ledgers/{id}/mark-paid
     */
    public function markAsPaid(Request $request, $id)
    {
        $request->validate([
            'payment_date' => 'required|date',
            'payment_reference' => 'required|string|max:255',
        ]);

        $ledger = VatTaxLedger::findOrFail($id);

        if ($ledger->is_paid) {
            return $this->sendError('Entry is already paid.', null, 400);
        }

        DB::beginTransaction();
        try {
            $ledger->markAsPaid($request->payment_reference, $request->payment_date);
            $ledger->updated_by = auth()->id();
            $ledger->save();

            DB::commit();
            return $this->sendSuccess($ledger->load('chartAccount'), 'Entry marked as paid successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to mark entry as paid.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Get VAT/Tax summary statistics.
     * GET /api/v2/finance/vat-tax-ledgers/summary
     */
    public function summary(Request $request)
    {
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'fiscal_year' => 'nullable|string',
        ]);

        $query = VatTaxLedger::query();

        // Apply date range filter
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('transaction_date', [$request->start_date, $request->end_date]);
        }

        // Apply fiscal year filter
        if ($request->has('fiscal_year')) {
            $query->where('fiscal_year', $request->fiscal_year);
        }

        $summary = $query->selectRaw('
            tax_type,
            direction,
            SUM(tax_amount) as total_amount,
            COUNT(*) as transaction_count
        ')
        ->groupBy('tax_type', 'direction')
        ->get();

        // Calculate totals by tax type and direction
        $vatInput = $summary->where('tax_type', 'vat')->where('direction', 'input')->first();
        $vatOutput = $summary->where('tax_type', 'vat')->where('direction', 'output')->first();
        $taxInput = $summary->where('tax_type', 'tax')->where('direction', 'input')->first();
        $taxOutput = $summary->where('tax_type', 'tax')->where('direction', 'output')->first();
        $aitInput = $summary->where('tax_type', 'ait')->where('direction', 'input')->first();
        $aitOutput = $summary->where('tax_type', 'ait')->where('direction', 'output')->first();

        $totalVatCollected = $vatOutput ? $vatOutput->total_amount : 0;
        $totalVatPaid = $vatInput ? $vatInput->total_amount : 0;
        $totalTaxCollected = ($taxOutput ? $taxOutput->total_amount : 0) + ($aitOutput ? $aitOutput->total_amount : 0);
        $totalTaxPaid = ($taxInput ? $taxInput->total_amount : 0) + ($aitInput ? $aitInput->total_amount : 0);

        return $this->sendSuccess([
            'by_type_and_direction' => $summary,
            'vat' => [
                'collected' => (float) $totalVatCollected,
                'paid' => (float) $totalVatPaid,
                'net' => (float) ($totalVatCollected - $totalVatPaid),
            ],
            'tax' => [
                'collected' => (float) $totalTaxCollected,
                'paid' => (float) $totalTaxPaid,
                'net' => (float) ($totalTaxCollected - $totalTaxPaid),
            ],
            'total' => [
                'collected' => (float) ($totalVatCollected + $totalTaxCollected),
                'paid' => (float) ($totalVatPaid + $totalTaxPaid),
                'net_payable' => (float) (($totalVatCollected + $totalTaxCollected) - ($totalVatPaid + $totalTaxPaid)),
            ],
            'transaction_counts' => [
                'total' => $summary->sum('transaction_count'),
                'pending' => (clone $query)->where('status', 'pending')->count(),
                'filed' => (clone $query)->where('status', 'filed')->count(),
                'paid' => (clone $query)->where('status', 'paid')->count(),
            ],
        ], 'VAT/Tax summary retrieved successfully.');
    }

    /**
     * Get net VAT/Tax calculation.
     * GET /api/v2/finance/vat-tax-ledgers/net-calculation
     */
    public function netCalculation(Request $request)
    {
        $request->validate([
            'fiscal_year' => 'nullable|string',
        ]);

        $fiscalYear = $request->fiscal_year ?? null;

        $netVat = VatTaxLedger::calculateNetVat($fiscalYear);
        $netTax = VatTaxLedger::calculateNetTax($fiscalYear);

        return $this->sendSuccess([
            'vat' => $netVat,
            'tax' => $netTax,
            'total_net_payable' => (float) ($netVat['net_vat'] + $netTax['net_tax']),
            'total_net_payable_positive' => ($netVat['net_vat'] + $netTax['net_tax']) > 0,
        ], 'Net VAT/Tax calculation retrieved successfully.');
    }

    /**
     * Get VAT/Tax entries grouped by period.
     * GET /api/v2/finance/vat-tax-ledgers/by-period
     */
    public function byPeriod(Request $request)
    {
        $request->validate([
            'fiscal_year' => 'nullable|string',
            'tax_type' => 'nullable|in:vat,tax,ait',
        ]);

        $query = VatTaxLedger::query();

        if ($request->has('fiscal_year')) {
            $query->where('fiscal_year', $request->fiscal_year);
        }

        if ($request->has('tax_type')) {
            $query->where('tax_type', $request->tax_type);
        }

        $entries = $query->selectRaw('
            fiscal_year,
            tax_period,
            tax_type,
            SUM(CASE WHEN direction = "output" THEN tax_amount ELSE 0 END) as output_tax,
            SUM(CASE WHEN direction = "input" THEN tax_amount ELSE 0 END) as input_tax,
            SUM(tax_amount) as net_tax,
            COUNT(*) as transaction_count,
            SUM(CASE WHEN is_paid = 0 THEN tax_amount ELSE 0 END) as unpaid_amount
        ')
        ->groupBy('fiscal_year', 'tax_period', 'tax_type')
        ->orderBy('fiscal_year', 'desc')
        ->orderBy('tax_period')
        ->get();

        return $this->sendSuccess($entries, 'VAT/Tax entries by period retrieved successfully.');
    }
}
