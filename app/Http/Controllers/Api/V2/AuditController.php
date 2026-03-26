<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\DocumentAttachment;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AuditController extends Controller
{
    protected AuditService $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Get audit logs with filters
     */
    public function index(Request $request): JsonResponse
    {
        $filters = [
            'entity_type' => $request->entity_type,
            'entity_id' => $request->entity_id,
            'action' => $request->action,
            'user_id' => $request->user_id,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'search' => $request->search,
        ];

        $logs = $this->auditService->search($filters)
            ->paginate($request->per_page ?? 50);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Get single audit log
     */
    public function show(int $id): JsonResponse
    {
        $log = AuditLog::with(['performer', 'documents', 'originalAudit', 'reversals'])
            ->find($id);

        if (!$log) {
            return response()->json([
                'success' => false,
                'message' => 'Audit log not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $log,
        ]);
    }

    /**
     * Get history for an entity
     */
    public function history(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity_type' => 'required|string',
            'entity_id' => 'required|integer',
        ]);

        $logs = $this->auditService->search([
            'entity_type' => $validated['entity_type'],
            'entity_id' => $validated['entity_id'],
        ])->paginate($request->per_page ?? 20);

        return response()->json([
            'success' => true,
            'data' => $logs,
        ]);
    }

    /**
     * Get audit statistics
     */
    public function statistics(Request $request): JsonResponse
    {
        $query = AuditLog::query();

        // Filter by date range if provided
        if ($request->start_date && $request->end_date) {
            $query->whereBetween('created_at', [$request->start_date, $request->end_date]);
        }

        $stats = [
            'total_logs' => (clone $query)->count(),
            'by_action' => (clone $query)->selectRaw('action, COUNT(*) as count')
                ->groupBy('action')
                ->pluck('count', 'action'),
            'by_entity_type' => (clone $query)->selectRaw('entity_type, COUNT(*) as count')
                ->groupBy('entity_type')
                ->pluck('count', 'entity_type'),
            'recent_activity' => (clone $query)->with('performer')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get(),
            'reversals' => (clone $query)->reversals()->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats,
        ]);
    }

    /**
     * Upload document to audit log
     */
    public function uploadDocument(Request $request, int $auditLogId): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:10240', // Max 10MB
            'document_type' => 'nullable|string',
            'document_number' => 'nullable|string',
            'document_date' => 'nullable|date',
            'description' => 'nullable|string',
            'is_confidential' => 'boolean',
        ]);

        $auditLog = AuditLog::find($auditLogId);

        if (!$auditLog) {
            return response()->json([
                'success' => false,
                'message' => 'Audit log not found',
            ], 404);
        }

        try {
            $document = $this->auditService->attachDocument(
                $auditLog,
                $request->file('file'),
                [
                    'document_type' => $validated['document_type'] ?? null,
                    'document_number' => $validated['document_number'] ?? null,
                    'document_date' => $validated['document_date'] ?? null,
                    'description' => $validated['description'] ?? null,
                    'is_confidential' => $validated['is_confidential'] ?? false,
                ]
            );

            return response()->json([
                'success' => true,
                'message' => 'Document uploaded successfully',
                'data' => $document,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload document',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Download document
     */
    public function downloadDocument(int $id): JsonResponse
    {
        $document = DocumentAttachment::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found',
            ], 404);
        }

        // Check access permissions
        if (!$document->canBeAccessedBy(auth()->user())) {
            return response()->json([
                'success' => false,
                'message' => 'You do not have permission to access this document',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'download_url' => $document->download_url,
                'file_name' => $document->file_name,
                'file_size' => $document->file_size_human,
            ],
        ]);
    }

    /**
     * Get documents for an entity
     */
    public function entityDocuments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity_type' => 'required|string',
            'entity_id' => 'required|integer',
        ]);

        $documents = DocumentAttachment::forEntity(
            $validated['entity_type'],
            $validated['entity_id']
        )
            ->with('uploader', 'auditLog')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $documents,
        ]);
    }

    /**
     * Get timeline of events
     */
    public function timeline(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entity_type' => 'required|string',
            'entity_id' => 'required|integer',
        ]);

        $logs = AuditLog::forEntity(
            $validated['entity_type'],
            $validated['entity_id']
        )
            ->with(['performer', 'documents'])
            ->orderBy('created_at', 'desc')
            ->get();

        // Group by date
        $timeline = $logs->groupBy(function ($log) {
            return $log->created_at->format('Y-m-d');
        })->map(function ($logs, $date) {
            return [
                'date' => $date,
                'events' => $logs->map(function ($log) {
                    return [
                        'id' => $log->id,
                        'time' => $log->created_at->format('H:i:s'),
                        'action' => $log->action,
                        'action_label' => $log->action_label,
                        'description' => $log->description,
                        'performed_by' => $log->performed_by_name,
                        'icon' => $log->icon,
                        'color' => $log->action_color,
                        'changes' => $log->formatted_changes,
                        'documents' => $log->documents->map(function ($doc) {
                            return [
                                'id' => $doc->id,
                                'file_name' => $doc->file_name,
                                'file_type' => $doc->file_type,
                                'document_type' => $doc->document_type,
                            ];
                        }),
                    ];
                }),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'data' => $timeline,
        ]);
    }
}
