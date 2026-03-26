<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProjectController extends Controller
{
    /**
     * Get all projects
     */
    public function index(Request $request): JsonResponse
    {
        $query = Project::with(['customer', 'manager', 'department', 'costCenter', 'creator']);

        // Filter by customer
        if ($request->customer_id) {
            $query->customer($request->customer_id);
        }

        // Filter by department
        if ($request->department_id) {
            $query->ofDepartment($request->department_id);
        }

        // Filter by cost center
        if ($request->cost_center_id) {
            $query->ofCostCenter($request->cost_center_id);
        }

        // Filter by manager
        if ($request->manager_id) {
            $query->where('manager_id', $request->manager_id);
        }

        // Filter by status
        if ($request->status) {
            $query->status($request->status);
        }

        // Filter by priority
        if ($request->priority) {
            $query->priority($request->priority);
        }

        // Active only
        if ($request->boolean('active')) {
            $query->active();
        }

        // Completed only
        if ($request->boolean('completed')) {
            $query->completed();
        }

        // Search
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->search . '%')
                  ->orWhere('code', 'like', '%' . $request->search . '%')
                  ->orWhere('description', 'like', '%' . $request->search . '%');
            });
        }

        $projects = $query->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        // Load computed attributes
        $projects->getCollection()->transform(function ($project) {
            $project->budget_utilization = $project->budget_utilization;
            $project->is_over_budget = $project->isOverBudget();
            $project->days_remaining = $project->days_remaining;
            $project->is_overdue = $project->isOverdue();
            $project->status_label = $project->status_label;
            $project->status_badge = $project->status_badge;
            $project->priority_label = $project->priority_label;
            $project->priority_color = $project->priority_color;
            return $project;
        });

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * Get single project
     */
    public function show(int $id): JsonResponse
    {
        $project = Project::with(['customer', 'manager', 'department', 'costCenter', 'creator', 'updater', 'expenses'])
            ->find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found',
            ], 404);
        }

        // Add computed attributes
        $project->budget_utilization = $project->budget_utilization;
        $project->is_over_budget = $project->isOverBudget();
        $project->days_remaining = $project->days_remaining;
        $project->is_overdue = $project->isOverdue();
        $project->status_label = $project->status_label;
        $project->status_badge = $project->status_badge;
        $project->priority_label = $project->priority_label;
        $project->priority_color = $project->priority_color;

        // Get recent expenses
        $recentExpenses = $project->expenses()
            ->with(['vendor', 'category'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'success' => true,
            'data' => array_merge($project->toArray(), [
                'recent_expenses' => $recentExpenses,
            ]),
        ]);
    }

    /**
     * Create new project
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:projects,code',
            'description' => 'nullable|string',
            'customer_id' => 'nullable|exists:customers,id',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after:start_date',
            'deadline' => 'nullable|date',
            'budget_amount' => 'required|numeric|min:0',
            'estimated_revenue' => 'required|numeric|min:0',
            'manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'cost_center_id' => 'nullable|exists:cost_centers,id',
            'status' => 'required|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'required|in:low,medium,high,urgent',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        // Generate project code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = Project::generateProjectCode();
        }

        $validated['actual_cost'] = 0;
        $validated['actual_revenue'] = 0;
        $validated['profit'] = $validated['estimated_revenue'];
        $validated['profit_margin'] = $validated['estimated_revenue'] > 0 ? 100 : 0;
        $validated['progress_percentage'] = $validated['progress_percentage'] ?? 0;
        $validated['created_by'] = auth()->id();
        $validated['updated_by'] = auth()->id();

        $project = Project::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Project created successfully',
            'data' => $project->load(['customer', 'manager', 'department', 'costCenter', 'creator']),
        ], 201);
    }

    /**
     * Update project
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50|unique:projects,code,' . $id,
            'description' => 'nullable|string',
            'customer_id' => 'nullable|exists:customers,id',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date|after:start_date',
            'deadline' => 'nullable|date',
            'budget_amount' => 'sometimes|numeric|min:0',
            'estimated_revenue' => 'sometimes|numeric|min:0',
            'actual_revenue' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:users,id',
            'department_id' => 'nullable|exists:departments,id',
            'cost_center_id' => 'nullable|exists:cost_centers,id',
            'status' => 'sometimes|in:planning,active,on_hold,completed,cancelled',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'progress_percentage' => 'nullable|integer|min:0|max:100',
            'location' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $validated['updated_by'] = auth()->id();

        $project->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Project updated successfully',
            'data' => $project->fresh()->load(['customer', 'manager', 'department', 'costCenter', 'creator', 'updater']),
        ]);
    }

    /**
     * Delete project
     */
    public function destroy(int $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found',
            ], 404);
        }

        $project->delete();

        return response()->json([
            'success' => true,
            'message' => 'Project deleted successfully',
        ]);
    }

    /**
     * Calculate project profitability
     */
    public function calculateProfitability(int $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found',
            ], 404);
        }

        $project->calculateProfitability();

        return response()->json([
            'success' => true,
            'message' => 'Profitability calculated successfully',
            'data' => $project->fresh()->load(['customer', 'manager', 'department']),
        ]);
    }

    /**
     * Update project progress
     */
    public function updateProgress(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'progress_percentage' => 'required|integer|min:0|max:100',
        ]);

        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found',
            ], 404);
        }

        $project->progress_percentage = $validated['progress_percentage'];
        $project->updated_by = auth()->id();

        // Auto-update status based on progress
        if ($project->progress_percentage >= 100 && $project->status !== 'completed') {
            $project->status = 'completed';
        } elseif ($project->progress_percentage > 0 && $project->status === 'planning') {
            $project->status = 'active';
        }

        $project->save();

        return response()->json([
            'success' => true,
            'message' => 'Progress updated successfully',
            'data' => $project->fresh()->load(['customer', 'manager', 'department']),
        ]);
    }

    /**
     * Get project expenses
     */
    public function expenses(Request $request, int $id): JsonResponse
    {
        $project = Project::find($id);

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found',
            ], 404);
        }

        $query = $project->expenses()->with(['vendor', 'category', 'paymentMethod']);

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
     * Get project statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = Project::query();

        // Filter by department if provided
        if ($request->department_id) {
            $query->ofDepartment($request->department_id);
        }

        // Filter by cost center if provided
        if ($request->cost_center_id) {
            $query->ofCostCenter($request->cost_center_id);
        }

        $projects = $query->get();

        $totalBudget = $projects->sum('budget_amount');
        $actualCost = $projects->sum('actual_cost');
        $totalRevenue = $projects->sum('actual_revenue');
        $totalProfit = $projects->sum('profit');

        $stats = [
            'total_projects' => $projects->count(),
            'active_projects' => $projects->where('status', 'active')->count(),
            'completed_projects' => $projects->where('status', 'completed')->count(),
            'over_budget_projects' => $projects->filter(fn($p) => $p->isOverBudget())->count(),
            'overdue_projects' => $projects->filter(fn($p) => $p->isOverdue())->count(),
            'total_budget' => $totalBudget,
            'total_actual_cost' => $actualCost,
            'total_revenue' => $totalRevenue,
            'total_profit' => $totalProfit,
            'overall_profit_margin' => $totalRevenue > 0 ? ($totalProfit / $totalRevenue) * 100 : 0,
            'projects_by_status' => [
                'planning' => $projects->where('status', 'planning')->count(),
                'active' => $projects->where('status', 'active')->count(),
                'on_hold' => $projects->where('status', 'on_hold')->count(),
                'completed' => $projects->where('status', 'completed')->count(),
                'cancelled' => $projects->where('status', 'cancelled')->count(),
            ],
            'projects_by_priority' => [
                'low' => $projects->where('priority', 'low')->count(),
                'medium' => $projects->where('priority', 'medium')->count(),
                'high' => $projects->where('priority', 'high')->count(),
                'urgent' => $projects->where('priority', 'urgent')->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Get next project code
     */
    public function getNextCode(): JsonResponse
    {
        $nextCode = Project::generateProjectCode();

        return response()->json([
            'success' => true,
            'data' => [
                'next_code' => $nextCode,
            ],
        ]);
    }
}
