<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\FiscalYear;
use App\Models\JournalEntry;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class FiscalYearController extends Controller
{
    /**
     * Get all fiscal years
     */
    public function index(Request $request): JsonResponse
    {
        $query = FiscalYear::with(['creator', 'closer']);

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Filter by closed status
        if ($request->has('is_closed')) {
            $query->where('is_closed', $request->boolean('is_closed'));
        }

        // Search by name
        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $fiscalYears = $query->orderBy('start_date', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $fiscalYears,
        ]);
    }

    /**
     * Get single fiscal year
     */
    public function show(int $id): JsonResponse
    {
        $fiscalYear = FiscalYear::with(['creator', 'closer'])->find($id);

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $fiscalYear,
        ]);
    }

    /**
     * Create new fiscal year
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['is_closed'] = false;
        $validated['created_by'] = auth()->id();

        $fiscalYear = FiscalYear::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Fiscal year created successfully',
            'data' => $fiscalYear->load(['creator']),
        ], 201);
    }

    /**
     * Update fiscal year
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $fiscalYear = FiscalYear::find($id);

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year not found',
            ], 404);
        }

        // Cannot modify closed fiscal year
        if ($fiscalYear->is_closed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify closed fiscal year',
            ], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $fiscalYear->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Fiscal year updated successfully',
            'data' => $fiscalYear->fresh()->load(['creator']),
        ]);
    }

    /**
     * Delete fiscal year
     */
    public function destroy(int $id): JsonResponse
    {
        $fiscalYear = FiscalYear::find($id);

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year not found',
            ], 404);
        }

        // Cannot delete closed fiscal year
        if ($fiscalYear->is_closed) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete closed fiscal year',
            ], 400);
        }

        $fiscalYear->delete();

        return response()->json([
            'success' => true,
            'message' => 'Fiscal year deleted successfully',
        ]);
    }

    /**
     * Close fiscal year
     */
    public function close(Request $request, int $id): JsonResponse
    {
        $fiscalYear = FiscalYear::find($id);

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year not found',
            ], 404);
        }

        if ($fiscalYear->is_closed) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year is already closed',
            ], 400);
        }

        try {
            $fiscalYear->close(auth()->id());

            return response()->json([
                'success' => true,
                'message' => 'Fiscal year closed successfully',
                'data' => $fiscalYear->fresh()->load(['creator', 'closer']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Reopen fiscal year
     */
    public function reopen(int $id): JsonResponse
    {
        $fiscalYear = FiscalYear::find($id);

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year not found',
            ], 404);
        }

        try {
            $fiscalYear->reopen();

            return response()->json([
                'success' => true,
                'message' => 'Fiscal year reopened successfully',
                'data' => $fiscalYear->fresh()->load(['creator', 'closer']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get fiscal year summary with financial data
     */
    public function summary(Request $request, int $id): JsonResponse
    {
        $fiscalYear = FiscalYear::find($id);

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'Fiscal year not found',
            ], 404);
        }

        // Get journal entries for this fiscal year
        $journalEntries = JournalEntry::whereBetween('date', [$fiscalYear->start_date, $fiscalYear->end_date])
            ->where('is_reversed', false)
            ->with(['items.account'])
            ->get();

        // Calculate totals
        $totalDebit = $journalEntries->sum(function ($entry) {
            return $entry->items->sum('debit');
        });

        $totalCredit = $journalEntries->sum(function ($entry) {
            return $entry->items->sum('credit');
        });

        // Get expenses for this fiscal year
        $expenses = Expense::whereBetween('date', [$fiscalYear->start_date, $fiscalYear->end_date])
            ->where('status', 'approved')
            ->get();

        $totalExpenses = $expenses->sum('amount');

        $summary = [
            'fiscal_year' => $fiscalYear,
            'journal_entries_count' => $journalEntries->count(),
            'total_debit' => $totalDebit,
            'total_credit' => $totalCredit,
            'is_balanced' => abs($totalDebit - $totalCredit) < 0.01,
            'expenses_count' => $expenses->count(),
            'total_expenses' => $totalExpenses,
            'period_days' => $fiscalYear->start_date->diffInDays($fiscalYear->end_date) + 1,
            'days_elapsed' => $fiscalYear->start_date->diffInDays(now()) + 1,
            'completion_percentage' => $fiscalYear->end_date->isPast()
                ? 100
                : min(100, max(0, round($fiscalYear->start_date->diffInDays(now()) / $fiscalYear->start_date->diffInDays($fiscalYear->end_date) * 100, 2))),
        ];

        return response()->json([
            'success' => true,
            'data' => $summary,
        ]);
    }

    /**
     * Get current active fiscal year
     */
    public function getCurrent(): JsonResponse
    {
        $fiscalYear = FiscalYear::getActiveForDate();

        if (!$fiscalYear) {
            return response()->json([
                'success' => false,
                'message' => 'No active fiscal year found for current date',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $fiscalYear->load(['creator']),
        ]);
    }

    /**
     * Get fiscal year statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = [
            'total_fiscal_years' => FiscalYear::count(),
            'active_fiscal_years' => FiscalYear::active()->count(),
            'closed_fiscal_years' => FiscalYear::closed()->count(),
            'open_fiscal_years' => FiscalYear::open()->count(),
            'current_fiscal_year' => FiscalYear::getActiveForDate(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Check if date is in closed period
     */
    public function checkDate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'required|date',
        ]);

        $isClosed = FiscalYear::isDateInClosedPeriod($validated['date']);

        return response()->json([
            'success' => true,
            'data' => [
                'date' => $validated['date'],
                'is_closed_period' => $isClosed,
                'message' => $isClosed
                    ? 'Date falls within a closed fiscal period'
                    : 'Date is in an open fiscal period',
            ],
        ]);
    }
}
