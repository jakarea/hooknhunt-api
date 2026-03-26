<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\FinancialReport;
use App\Models\ReportTemplate;
use App\Services\FinancialReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class FinancialReportController extends Controller
{
    protected FinancialReportService $reportService;

    public function __construct(FinancialReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Get all reports
     */
    public function index(Request $request): JsonResponse
    {
        $query = FinancialReport::query();

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->withStatus($request->status);
        }

        // Filter scheduled reports
        if ($request->boolean('scheduled')) {
            $query->scheduled();
        }

        $reports = $query->with(['creator', 'template'])
            ->orderBy('created_at', 'desc')
            ->paginate($request->per_page ?? 15);

        return response()->json([
            'success' => true,
            'data' => $reports,
        ]);
    }

    /**
     * Get single report
     */
    public function show(int $id): JsonResponse
    {
        $report = FinancialReport::with(['creator', 'template', 'updater'])->find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Create new report
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'type' => 'required|in:comparative,ratio,cash_flow,fund_flow,custom',
            'description' => 'nullable|string',
            'template_id' => 'nullable|exists:report_templates,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after:start_date',
            'compare_start_date' => 'nullable|date',
            'compare_end_date' => 'nullable|date|after:compare_start_date',
            'period_type' => 'nullable|in:monthly,quarterly,yearly,custom',
            'config' => 'nullable|array',
            'columns' => 'nullable|array',
            'filters' => 'nullable|array',
            'is_scheduled' => 'boolean',
            'schedule_frequency' => 'nullable|in:daily,weekly,monthly,quarterly',
            'export_format' => 'nullable|in:pdf,excel,csv',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $report = FinancialReport::create([
            'name' => $request->name,
            'type' => $request->type,
            'description' => $request->description,
            'template_id' => $request->template_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'compare_start_date' => $request->compare_start_date,
            'compare_end_date' => $request->compare_end_date,
            'period_type' => $request->period_type,
            'config' => $request->config ?? [],
            'columns' => $request->columns ?? [],
            'filters' => $request->filters ?? [],
            'is_scheduled' => $request->boolean('is_scheduled', false),
            'schedule_frequency' => $request->schedule_frequency,
            'export_format' => $request->export_format ?? 'pdf',
            'status' => 'pending',
            'created_by' => auth()->id(),
            'updated_by' => auth()->id(),
        ]);

        // Update next run date if scheduled
        if ($report->is_scheduled) {
            $report->updateNextRunDate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Report created successfully',
            'data' => $report,
        ], 201);
    }

    /**
     * Update report
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'sometimes|date',
            'end_date' => 'sometimes|date|after:start_date',
            'compare_start_date' => 'nullable|date',
            'compare_end_date' => 'nullable|date|after:compare_start_date',
            'period_type' => 'nullable|in:monthly,quarterly,yearly,custom',
            'config' => 'nullable|array',
            'columns' => 'nullable|array',
            'filters' => 'nullable|array',
            'is_scheduled' => 'boolean',
            'schedule_frequency' => 'nullable|in:daily,weekly,monthly,quarterly',
            'export_format' => 'nullable|in:pdf,excel,csv',
        ]);

        $validated['updated_by'] = auth()->id();

        $report->update($validated);

        if ($report->is_scheduled) {
            $report->updateNextRunDate();
        }

        return response()->json([
            'success' => true,
            'message' => 'Report updated successfully',
            'data' => $report->fresh(),
        ]);
    }

    /**
     * Delete report
     */
    public function destroy(int $id): JsonResponse
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted successfully',
        ]);
    }

    /**
     * Generate report
     */
    public function generate(int $id): JsonResponse
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        if (!$report->isReadyToGenerate()) {
            return response()->json([
                'success' => false,
                'message' => 'Report is currently generating or already completed',
            ], 400);
        }

        try {
            $report->markAsGenerating();

            // Generate report based on type
            $result = match ($report->type) {
                'comparative' => $this->reportService->generateComparativeReport($report),
                'ratio' => $this->reportService->generateRatioReport($report),
                'cash_flow' => $this->reportService->generateCashFlowReport($report),
                'fund_flow' => $this->reportService->generateFundFlowReport($report),
                'custom' => $this->reportService->generateCustomReport($report),
                default => throw new \Exception('Unknown report type'),
            };

            $report->markAsCompleted($result['data'], $result['summary']);

            return response()->json([
                'success' => true,
                'message' => 'Report generated successfully',
                'data' => $report->fresh(),
            ]);
        } catch (\Exception $e) {
            $report->markAsFailed($e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to generate report',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Export report
     */
    public function export(int $id): JsonResponse
    {
        $report = FinancialReport::find($id);

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        if (!$report->isCompleted()) {
            return response()->json([
                'success' => false,
                'message' => 'Report must be generated before exporting',
            ], 400);
        }

        // Export based on format
        // For now, return the data
        return response()->json([
            'success' => true,
            'message' => 'Export feature - use external export library',
            'data' => [
                'format' => $report->export_format,
                'report_data' => $report->data,
                'summary' => $report->summary,
            ],
        ]);
    }

    /**
     * Get report templates
     */
    public function templates(Request $request): JsonResponse
    {
        $query = ReportTemplate::query();

        // Filter by type
        if ($request->has('type')) {
            $query->ofType($request->type);
        }

        // Filter by category
        if ($request->has('category')) {
            $query->inCategory($request->category);
        }

        $templates = $query->active()
            ->orderBy('is_system', 'desc')
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $templates,
        ]);
    }

    /**
     * Get report statistics
     */
    public function statistics(): JsonResponse
    {
        $stats = [
            'total_reports' => FinancialReport::count(),
            'completed_reports' => FinancialReport::where('status', 'completed')->count(),
            'pending_reports' => FinancialReport::where('status', 'pending')->count(),
            'failed_reports' => FinancialReport::where('status', 'failed')->count(),
            'scheduled_reports' => FinancialReport::where('is_scheduled', true)->count(),
            'reports_by_type' => [
                'comparative' => FinancialReport::ofType('comparative')->count(),
                'ratio' => FinancialReport::ofType('ratio')->count(),
                'cash_flow' => FinancialReport::ofType('cash_flow')->count(),
                'fund_flow' => FinancialReport::ofType('fund_flow')->count(),
                'custom' => FinancialReport::ofType('custom')->count(),
            ],
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }
}
