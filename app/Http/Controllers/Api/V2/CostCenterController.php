<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\CostCenter;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class CostCenterController extends Controller
{
    /**
     * Get all cost centers
     */
    public function index(Request $request): JsonResponse
    {
        $query = CostCenter::with(['department', 'manager', 'creator']);

        // Filter by department
        if ($request->department_id) {
            $query->ofDepartment($request->department_id);
        }

        // Filter by manager
        if ($request->manager_id) {
            $query->where('manager_id', $request->manager_id);
        }

        // Filter by active status
        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        // Search by name, code, or description
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('code', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        // Active only
        if ($request->boolean('active')) {
            $query->active();
        }

        $costCenters = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        // Load computed attributes
        $costCenters->getCollection()->transform(function ($costCenter) {
            $costCenter->budget_utilization = $costCenter->budget_utilization;
            $costCenter->is_over_budget = $costCenter->isOverBudget();
            $costCenter->is_approaching_limit = $costCenter->isApproachingLimit();
            return $costCenter;
        });

        return response()->json([
            'success' => true,
            'data' => $costCenters,
        ]);
    }

    /**
     * Get single cost center
     */
    public function show(int $id): JsonResponse
    {
        $costCenter = CostCenter::with(['department', 'manager', 'creator', 'updater', 'projects', 'expenses'])
            ->find($id);

        if (!$costCenter) {
            return response()->json([
                'success' => false,
                'message' => 'Cost center not found',
            ], 404);
        }

        // Add computed attributes
        $costCenter->budget_utilization = $costCenter->budget_utilization;
        $costCenter->is_over_budget = $costCenter->isOverBudget();
        $costCenter->is_approaching_limit = $costCenter->isApproachingLimit();

        // Get recent expenses
        $recentExpenses = $costCenter->expenses()
            ->with(['vendor', 'category'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => array_merge($costCenter->toArray(), [
                'recent_expenses' => $recentExpenses,
            ]),
        ]);
    }

    /**
     * Create new cost center
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:cost_centers,code',
            'description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'manager_id' => 'nullable|exists:users,id',
            'monthly_budget' => 'required|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        // Generate cost center code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = CostCenter::generateCostCenterCode();
        }

        $validated['actual_spent'] = 0;
        $validated['remaining_budget'] = $validated['monthly_budget'];
        $validated['is_active'] = $validated['is_active'] ?? true;
        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        $costCenter = CostCenter::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cost center created successfully',
            'data' => $costCenter->load(['department', 'manager', 'creator']),
        ], 201);
    }

    /**
     * Update cost center
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $costCenter = CostCenter::find($id);

        if (!$costCenter) {
            return response()->json([
                'success' => false,
                'message' => 'Cost center not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50|unique:cost_centers,code,' . $id,
            'description' => 'nullable|string',
            'department_id' => 'nullable|exists:departments,id',
            'manager_id' => 'nullable|exists:users,id',
            'monthly_budget' => 'sometimes|numeric|min:0',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'notes' => 'nullable|string',
        ]);

        $validated['updated_by'] = auth()->id();

        // Recalculate remaining budget if monthly_budget changed
        if (isset($validated['monthly_budget'])) {
            $validated['remaining_budget'] = $validated['monthly_budget'] - $costCenter->actual_spent;
        }

        $costCenter->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cost center updated successfully',
            'data' => $costCenter->fresh()->load(['department', 'manager', 'creator', 'updater']),
        ]);
    }

    /**
     * Delete cost center
     */
    public function destroy(int $id): JsonResponse
    {
        $costCenter = CostCenter::find($id);

        if (!$costCenter) {
            return response()->json([
                'success' => false,
                'message' => 'Cost center not found',
            ], 404);
        }

        $costCenter->delete();

        return response()->json([
            'success' => true,
            'message' => 'Cost center deleted successfully',
        ]);
    }

    /**
     * Allocate budget to cost center
     */
    public function allocateBudget(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        $costCenter = CostCenter::find($id);

        if (!$costCenter) {
            return response()->json([
                'success' => false,
                'message' => 'Cost center not found',
            ], 404);
        }

        $costCenter->monthly_budget += $validated['amount'];
        $costCenter->remaining_budget += $validated['amount'];
        $costCenter->updated_by = auth()->id();
        $costCenter->save();

        return response()->json([
            'success' => true,
            'message' => 'Budget allocated successfully',
            'data' => $costCenter->fresh()->load(['department', 'manager']),
        ]);
    }

    /**
     * Recalculate budget utilization
     */
    public function recalculateBudget(int $id): JsonResponse
    {
        $costCenter = CostCenter::find($id);

        if (!$costCenter) {
            return response()->json([
                'success' => false,
                'message' => 'Cost center not found',
            ], 404);
        }

        $costCenter->calculateBudgetUtilization();

        return response()->json([
            'success' => true,
            'message' => 'Budget recalculated successfully',
            'data' => $costCenter->fresh()->load(['department', 'manager']),
        ]);
    }

    /**
     * Get cost center expenses
     */
    public function expenses(Request $request, int $id): JsonResponse
    {
        $costCenter = CostCenter::find($id);

        if (!$costCenter) {
            return response()->json([
                'success' => false,
                'message' => 'Cost center not found',
            ], 404);
        }

        $query = $costCenter->expenses()->with(['vendor', 'category', 'paymentMethod']);

        // Filter by date range
        if ($request->start_date && $request->end_date) {
            $query->whereBetween('date', [$request->start_date, $request->end_date]);
        }

        // Filter by status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        $expenses = $query->orderBy('date', 'desc')
            ->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $expenses,
        ]);
    }

    /**
     * Get cost center statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = CostCenter::query();

        // Filter by department if provided
        if ($request->department_id) {
            $query->ofDepartment($request->department_id);
        }

        $costCenters = $query->get();

        $totalBudget = $costCenters->sum('monthly_budget');
        $totalSpent = $costCenters->sum('actual_spent');
        $totalRemaining = $costCenters->sum('remaining_budget');

        $stats = [
            'total_cost_centers' => $costCenters->count(),
            'active_cost_centers' => $costCenters->where('is_active', true)->count(),
            'inactive_cost_centers' => $costCenters->where('is_active', false)->count(),
            'over_budget_count' => $costCenters->filter(fn($cc) => $cc->isOverBudget())->count(),
            'approaching_limit_count' => $costCenters->filter(fn($cc) => $cc->isApproachingLimit())->count(),
            'total_monthly_budget' => $totalBudget,
            'total_actual_spent' => $totalSpent,
            'total_remaining_budget' => $totalRemaining,
            'overall_budget_utilization' => $totalBudget > 0 ? ($totalSpent / $totalBudget) * 100 : 0,
            'cost_centers_by_department' => $costCenters->groupBy('department_id')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'total_budget' => $group->sum('monthly_budget'),
                    'total_spent' => $group->sum('actual_spent'),
                ];
            }),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get next cost center code
     */
    public function getNextCode(): JsonResponse
    {
        $nextCode = CostCenter::generateCostCenterCode();

        return response()->json([
            'success' => true,
            'data' => [
                'next_code' => $nextCode,
            ],
        ]);
    }
}
