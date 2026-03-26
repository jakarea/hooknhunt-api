<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Budget;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BudgetController extends Controller
{
    /**
     * Get all budgets
     */
    public function index(Request $request): JsonResponse
    {
        $query = Budget::with(['chartAccount', 'creator', 'approver']);

        // Filter by fiscal year
        if ($request->fiscal_year) {
            $query->fiscalYear($request->fiscal_year);
        }

        // Filter by period type
        if ($request->period_type) {
            $query->periodType($request->period_type);
        }

        // Filter by status
        if ($request->status) {
            $query->status($request->status);
        }

        // Filter by scope type
        if ($request->scope_type) {
            $query->scopeType($request->scope_type);
        }

        // Filter by account
        if ($request->account_id) {
            $query->where('account_id', $request->account_id);
        }

        // Search by name or description
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Active budgets only
        if ($request->boolean('active')) {
            $query->active();
        }

        // Budgets needing alert
        if ($request->boolean('needing_alert')) {
            $query->needingAlert();
        }

        $budgets = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        // Load computed attributes for each budget
        $budgets->getCollection()->transform(function ($budget) {
            $budget->usage_percentage = $budget->usage_percentage;
            $budget->is_exceeded = $budget->isExceeded();
            $budget->needs_alert = $budget->needsAlert();
            $budget->status_label = $budget->status_label;
            $budget->status_badge = $budget->status_badge;
            $budget->variance_status = $budget->variance_status;
            $budget->variance_color = $budget->variance_color;
            $budget->period_type_label = $budget->period_type_label;
            $budget->scope_type_label = $budget->scope_type_label;
            return $budget;
        });

        return response()->json([
            'success' => true,
            'data' => $budgets,
        ]);
    }

    /**
     * Get single budget
     */
    public function show(int $id): JsonResponse
    {
        $budget = Budget::with(['chartAccount', 'creator', 'updater', 'approver'])
            ->find($id);

        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found',
            ], 404);
        }

        // Add computed attributes
        $budget->usage_percentage = $budget->usage_percentage;
        $budget->is_exceeded = $budget->isExceeded();
        $budget->needs_alert = $budget->needsAlert();
        $budget->status_label = $budget->status_label;
        $budget->status_badge = $budget->status_badge;
        $budget->variance_status = $budget->variance_status;
        $budget->variance_color = $budget->variance_color;
        $budget->period_type_label = $budget->period_type_label;
        $budget->scope_type_label = $budget->scope_type_label;

        return response()->json([
            'success' => true,
            'data' => $budget,
        ]);
    }

    /**
     * Create new budget
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'account_id' => 'nullable|exists:chart_of_accounts,id',
            'scope_type' => 'required|in:company,department,account',
            'scope_id' => 'nullable|string|max:255',
            'period_type' => 'required|in:monthly,quarterly,yearly,custom',
            'fiscal_year' => 'required|string|max:20',
            'period_name' => 'nullable|string|max:255',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'planned_amount' => 'required|numeric|min:0',
            'alert_threshold' => 'nullable|numeric|min:1|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['actual_amount'] = 0;
        $validated['variance'] = $validated['planned_amount'];
        $validated['variance_percentage'] = 0;
        $validated['status'] = 'draft';
        $validated['alert_threshold'] = $validated['alert_threshold'] ?? 80;
        $validated['alert_sent'] = false;
        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        $budget = Budget::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Budget created successfully',
            'data' => $budget->load(['chartAccount', 'creator']),
        ], 201);
    }

    /**
     * Update budget
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $budget = Budget::find($id);

        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found',
            ], 404);
        }

        // Cannot modify approved/active budgets
        if (in_array($budget->status, ['active', 'completed', 'exceeded'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify ' . $budget->status . ' budget',
            ], 400);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'account_id' => 'nullable|exists:chart_of_accounts,id',
            'scope_type' => 'sometimes|in:company,department,account',
            'scope_id' => 'nullable|string|max:255',
            'period_type' => 'sometimes|in:monthly,quarterly,yearly,custom',
            'fiscal_year' => 'sometimes|string|max:20',
            'period_name' => 'nullable|string|max:255',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'planned_amount' => 'sometimes|numeric|min:0',
            'alert_threshold' => 'nullable|numeric|min:1|max:100',
            'notes' => 'nullable|string',
        ]);

        $validated['updated_by'] = auth()->id();

        // Recalculate variance if planned_amount changed
        if (isset($validated['planned_amount'])) {
            $validated['variance'] = $validated['planned_amount'] - $budget->actual_amount;
            $validated['variance_percentage'] = $validated['planned_amount'] > 0
                ? ($validated['variance'] / $validated['planned_amount']) * 100
                : 0;
        }

        $budget->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Budget updated successfully',
            'data' => $budget->fresh()->load(['chartAccount', 'creator', 'updater']),
        ]);
    }

    /**
     * Delete budget
     */
    public function destroy(int $id): JsonResponse
    {
        $budget = Budget::find($id);

        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found',
            ], 404);
        }

        // Cannot delete approved/active budgets
        if (in_array($budget->status, ['active', 'completed', 'exceeded'])) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot delete ' . $budget->status . ' budget',
            ], 400);
        }

        $budget->delete();

        return response()->json([
            'success' => true,
            'message' => 'Budget deleted successfully',
        ]);
    }

    /**
     * Approve budget
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $budget = Budget::find($id);

        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found',
            ], 404);
        }

        if ($budget->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Only draft budgets can be approved',
            ], 400);
        }

        $budget->approve(auth()->id());

        return response()->json([
            'success' => true,
            'message' => 'Budget approved successfully',
            'data' => $budget->fresh()->load(['chartAccount', 'creator', 'approver']),
        ]);
    }

    /**
     * Update actual amount
     */
    public function updateActual(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'actual_amount' => 'required|numeric|min:0',
        ]);

        $budget = Budget::find($id);

        if (!$budget) {
            return response()->json([
                'success' => false,
                'message' => 'Budget not found',
            ], 404);
        }

        $budget->actual_amount = $validated['actual_amount'];
        $budget->calculateVariance();

        return response()->json([
            'success' => true,
            'message' => 'Actual amount updated successfully',
            'data' => $budget->fresh()->load(['chartAccount', 'creator']),
        ]);
    }

    /**
     * Get budget variance report
     */
    public function varianceReport(Request $request): JsonResponse
    {
        $query = Budget::with(['chartAccount']);

        // Filter by fiscal year
        if ($request->fiscal_year) {
            $query->fiscalYear($request->fiscal_year);
        }

        // Filter by period type
        if ($request->period_type) {
            $query->periodType($request->period_type);
        }

        // Filter by scope type
        if ($request->scope_type) {
            $query->scopeType($request->scope_type);
        }

        $budgets = $query->get();

        // Calculate totals
        $totalPlanned = $budgets->sum('planned_amount');
        $totalActual = $budgets->sum('actual_amount');
        $totalVariance = $budgets->sum('variance');
        $exceededCount = $budgets->where('status', 'exceeded')->count();
        $onTrackCount = $budgets->where('status', 'active')->where('actual_amount', '<=', function ($item) {
            return $item->planned_amount;
        })->count();

        $report = [
            'summary' => [
                'total_budgets' => $budgets->count(),
                'total_planned' => $totalPlanned,
                'total_actual' => $totalActual,
                'total_variance' => $totalVariance,
                'variance_percentage' => $totalPlanned > 0 ? ($totalVariance / $totalPlanned) * 100 : 0,
                'exceeded_count' => $exceededCount,
                'on_track_count' => $onTrackCount,
            ],
            'budgets' => $budgets->map(function ($budget) {
                return [
                    'id' => $budget->id,
                    'name' => $budget->name,
                    'account' => $budget->chartAccount?->account_name,
                    'period_type' => $budget->period_type_label,
                    'fiscal_year' => $budget->fiscal_year,
                    'planned_amount' => $budget->planned_amount,
                    'actual_amount' => $budget->actual_amount,
                    'variance' => $budget->variance,
                    'variance_percentage' => $budget->variance_percentage,
                    'variance_status' => $budget->variance_status,
                    'variance_color' => $budget->variance_color,
                    'usage_percentage' => $budget->usage_percentage,
                    'status' => $budget->status_label,
                    'status_badge' => $budget->status_badge,
                ];
            }),
        ];

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get budget statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = Budget::query();

        // Filter by fiscal year if provided
        if ($request->fiscal_year) {
            $query->fiscalYear($request->fiscal_year);
        }

        $stats = [
            'total_budgets' => (clone $query)->count(),
            'draft_budgets' => (clone $query)->status('draft')->count(),
            'active_budgets' => (clone $query)->status('active')->count(),
            'completed_budgets' => (clone $query)->status('completed')->count(),
            'exceeded_budgets' => (clone $query)->status('exceeded')->count(),
            'budgets_needing_alert' => (clone $query)->needingAlert()->count(),
            'total_planned_amount' => (clone $query)->sum('planned_amount'),
            'total_actual_amount' => (clone $query)->sum('actual_amount'),
            'total_variance' => (clone $query)->sum('variance'),
            'by_period_type' => [
                'monthly' => (clone $query)->periodType('monthly')->count(),
                'quarterly' => (clone $query)->periodType('quarterly')->count(),
                'yearly' => (clone $query)->periodType('yearly')->count(),
                'custom' => (clone $query)->periodType('custom')->count(),
            ],
            'by_scope_type' => [
                'company' => (clone $query)->scopeType('company')->count(),
                'department' => (clone $query)->scopeType('department')->count(),
                'account' => (clone $query)->scopeType('account')->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
