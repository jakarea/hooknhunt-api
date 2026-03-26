<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Cheque;
use App\Models\Bank;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ChequeController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of cheques.
     * GET /api/v2/finance/cheques
     */
    public function index(Request $request)
    {
        $query = Cheque::with(['bank', 'creator', 'updater']);

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            if ($request->status === 'bounced') {
                $query->bounced();
            } else {
                $query->where('status', $request->status);
            }
        }

        // Filter by bank
        if ($request->has('bank_id')) {
            $query->fromBank($request->bank_id);
        }

        // Filter by due date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->dueBetween($request->start_date, $request->end_date);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('cheque_number', 'like', "%{$search}%")
                  ->orWhere('payee_name', 'like', "%{$search}%")
                  ->orWhere('party_name', 'like', "%{$search}%");
            });
        }

        $cheques = $query->orderBy('due_date', 'asc')
                        ->orderBy('created_at', 'desc')
                        ->paginate($request->per_page ?? 15);

        return $this->sendSuccess($cheques, 'Cheques retrieved successfully.');
    }

    /**
     * Store a newly created cheque.
     * POST /api/v2/finance/cheques
     */
    public function store(Request $request)
    {
        $request->validate([
            'cheque_number' => 'required|string|max:255|unique:cheques,cheque_number',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:issue_date',
            'amount' => 'required|numeric|min:0',
            'payee_name' => 'required|string|max:255',
            'bank_id' => 'nullable|exists:banks,id',
            'branch_name' => 'nullable|string|max:255',
            'type' => 'required|in:incoming,outgoing',
            'reference_type' => 'nullable|string|max:255',
            'reference_id' => 'nullable|integer',
            'party_name' => 'nullable|string|max:255',
            'party_contact' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'attachment' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Get bank name if bank_id provided
            $bankName = null;
            if ($request->bank_id) {
                $bank = Bank::find($request->bank_id);
                if ($bank) {
                    $bankName = $bank->name;
                }
            }

            $cheque = Cheque::create([
                'cheque_number' => $request->cheque_number,
                'issue_date' => $request->issue_date,
                'due_date' => $request->due_date,
                'amount' => $request->amount,
                'payee_name' => $request->payee_name,
                'bank_id' => $request->bank_id,
                'bank_name' => $bankName,
                'branch_name' => $request->branch_name,
                'type' => $request->type,
                'reference_type' => $request->reference_type,
                'reference_id' => $request->reference_id,
                'party_name' => $request->party_name,
                'party_contact' => $request->party_contact,
                'notes' => $request->notes,
                'attachment' => $request->attachment,
                'status' => 'pending',
                'created_by' => auth()->id(),
                'updated_by' => auth()->id(),
            ]);

            DB::commit();
            return $this->sendSuccess($cheque->load('bank'), 'Cheque created successfully.', 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create cheque.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Display the specified cheque.
     * GET /api/v2/finance/cheques/{id}
     */
    public function show($id)
    {
        $cheque = Cheque::with(['bank', 'creator', 'updater'])->findOrFail($id);

        // Add computed values
        $cheque->days_until_due = $cheque->days_until_due;
        $cheque->is_due_today = $cheque->isDueToday();
        $cheque->is_overdue = $cheque->isOverdue();
        $cheque->is_upcoming = $cheque->isUpcoming();

        return $this->sendSuccess($cheque, 'Cheque retrieved successfully.');
    }

    /**
     * Update the specified cheque.
     * PUT/PATCH /api/v2/finance/cheques/{id}
     */
    public function update(Request $request, $id)
    {
        $request->validate([
            'cheque_number' => 'sometimes|string|max:255|unique:cheques,cheque_number,' . $id,
            'issue_date' => 'sometimes|date',
            'due_date' => 'sometimes|date|after_or_equal:issue_date',
            'amount' => 'sometimes|numeric|min:0',
            'payee_name' => 'sometimes|string|max:255',
            'bank_id' => 'nullable|exists:banks,id',
            'branch_name' => 'nullable|string|max:255',
            'party_name' => 'nullable|string|max:255',
            'party_contact' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
            'attachment' => 'nullable|string',
        ]);

        $cheque = Cheque::findOrFail($id);

        // Prevent modification if cleared or cancelled
        if (in_array($cheque->status, ['cleared', 'cancelled'])) {
            return $this->sendError('Cannot modify a ' . $cheque->status . ' cheque.', null, 400);
        }

        DB::beginTransaction();
        try {
            // Get bank name if bank_id changed
            $bankName = $cheque->bank_name;
            if ($request->has('bank_id') && $request->bank_id) {
                $bank = Bank::find($request->bank_id);
                if ($bank) {
                    $bankName = $bank->name;
                }
            }

            $cheque->update($request->only([
                'cheque_number',
                'issue_date',
                'due_date',
                'amount',
                'payee_name',
                'bank_id',
                'branch_name',
                'party_name',
                'party_contact',
                'notes',
                'attachment',
            ]));

            $cheque->bank_name = $bankName;
            $cheque->updated_by = auth()->id();
            $cheque->save();

            DB::commit();
            return $this->sendSuccess($cheque->load('bank'), 'Cheque updated successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to update cheque.', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Remove the specified cheque.
     * DELETE /api/v2/finance/cheques/{id}
     */
    public function destroy($id)
    {
        $cheque = Cheque::findOrFail($id);

        // Prevent deletion if cleared (should be archived instead)
        if ($cheque->status === 'cleared') {
            return $this->sendError('Cannot delete a cleared cheque. It should be kept for records.', null, 400);
        }

        $cheque->delete();

        return $this->sendSuccess(null, 'Cheque deleted successfully.');
    }

    /**
     * Mark cheque as deposited
     * POST /api/v2/finance/cheques/{id}/deposit
     */
    public function deposit(Request $request, $id)
    {
        $request->validate([
            'deposit_date' => 'nullable|date',
        ]);

        $cheque = Cheque::findOrFail($id);

        if ($cheque->status !== 'pending') {
            return $this->sendError('Can only deposit pending cheques.', null, 400);
        }

        $cheque->markAsDeposited($request->deposit_date ?? null);
        $cheque->updated_by = auth()->id();
        $cheque->save();

        return $this->sendSuccess($cheque->load('bank'), 'Cheque marked as deposited.');
    }

    /**
     * Mark cheque as cleared
     * POST /api/v2/finance/cheques/{id}/clear
     */
    public function clear(Request $request, $id)
    {
        $request->validate([
            'clearance_date' => 'nullable|date',
        ]);

        $cheque = Cheque::findOrFail($id);

        if (!in_array($cheque->status, ['pending', 'deposited'])) {
            return $this->sendError('Cheque must be pending or deposited to clear.', null, 400);
        }

        $cheque->markAsCleared($request->clearance_date ?? null);
        $cheque->updated_by = auth()->id();
        $cheque->save();

        return $this->sendSuccess($cheque->load('bank'), 'Cheque cleared successfully.');
    }

    /**
     * Mark cheque as bounced
     * POST /api/v2/finance/cheques/{id}/bounce
     */
    public function bounce(Request $request, $id)
    {
        $request->validate([
            'bounce_reason' => 'required|string',
        ]);

        $cheque = Cheque::findOrFail($id);

        if (in_array($cheque->status, ['cleared', 'cancelled', 'bounced', 'dishonored'])) {
            return $this->sendError('Cannot mark this cheque as bounced.', null, 400);
        }

        $cheque->markAsBounced($request->bounce_reason);
        $cheque->updated_by = auth()->id();
        $cheque->save();

        return $this->sendSuccess($cheque->load('bank'), 'Cheque marked as bounced.');
    }

    /**
     * Cancel cheque
     * POST /api/v2/finance/cheques/{id}/cancel
     */
    public function cancel($id)
    {
        $cheque = Cheque::findOrFail($id);

        if ($cheque->status === 'cleared') {
            return $this->sendError('Cannot cancel a cleared cheque.', null, 400);
        }

        if ($cheque->status === 'cancelled') {
            return $this->sendError('Cheque is already cancelled.', null, 400);
        }

        $cheque->cancel();
        $cheque->updated_by = auth()->id();
        $cheque->save();

        return $this->sendSuccess($cheque->load('bank'), 'Cheque cancelled successfully.');
    }

    /**
     * Get cheques needing attention (alerts)
     * GET /api/v2/finance/cheques/alerts
     */
    public function alerts(Request $request)
    {
        $days = $request->get('days', 7);

        $upcoming = Cheque::getChequesNeedingAlert($days);
        $overdue = Cheque::getOverdueCheques();

        return $this->sendSuccess([
            'upcoming' => $upcoming,
            'overdue' => $overdue,
            'summary' => [
                'upcoming_count' => $upcoming->count(),
                'overdue_count' => $overdue->count(),
                'total_attention_needed' => $upcoming->count() + $overdue->count(),
            ],
        ], 'Cheque alerts retrieved successfully.');
    }

    /**
     * Get cheque summary statistics
     * GET /api/v2/finance/cheques/summary
     */
    public function summary()
    {
        $pending = Cheque::pending()->count();
        $deposited = Cheque::deposited()->count();
        $cleared = Cheque::cleared()->count();
        $bounced = Cheque::bounced()->count();
        $cancelled = Cheque::cancelled()->count();

        $incoming = Cheque::incoming()->count();
        $outgoing = Cheque::outgoing()->count();

        $totalAmountPending = Cheque::pending()->sum('amount');
        $totalAmountCleared = Cheque::cleared()->sum('amount');
        $totalAmountBounced = Cheque::bounced()->sum('amount');

        return $this->sendSuccess([
            'by_status' => [
                'pending' => $pending,
                'deposited' => $deposited,
                'cleared' => $cleared,
                'bounced' => $bounced,
                'cancelled' => $cancelled,
            ],
            'by_type' => [
                'incoming' => $incoming,
                'outgoing' => $outgoing,
            ],
            'amounts' => [
                'pending_amount' => (float) $totalAmountPending,
                'cleared_amount' => (float) $totalAmountCleared,
                'bounced_amount' => (float) $totalAmountBounced,
            ],
        ], 'Cheque summary retrieved successfully.');
    }
}
