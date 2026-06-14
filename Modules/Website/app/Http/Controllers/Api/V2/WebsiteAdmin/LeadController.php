<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin;

use App\Modules\CRM\Models\Lead;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class LeadController extends Controller
{
    /**
     * Display a listing of leads with filters
     * GET /api/v2/website-admin/crm/leads
     */
    public function index(Request $request)
    {
        $query = Lead::with(['assignedAgent:id,name', 'customer']);

        // Apply filters
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('source')) {
            $query->where('source', $request->source);
        }
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%{$search}%")
                  ->orWhere('phone', 'LIKE', "%{$search}%")
                  ->orWhere('email', 'LIKE', "%{$search}%")
                  ->orWhere('subject', 'LIKE', "%{$search}%");
            });
        }

        // Date filter
        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->input('per_page', 20);
        $leads = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => [
                'leads' => $leads->items(),
                'pagination' => [
                    'current_page' => $leads->currentPage(),
                    'last_page' => $leads->lastPage(),
                    'per_page' => $leads->perPage(),
                    'total' => $leads->total(),
                    'from' => $leads->firstItem(),
                    'to' => $leads->lastItem(),
                ]
            ]
        ]);
    }

    /**
     * Display the specified lead
     * GET /api/v2/website-admin/crm/leads/{id}
     */
    public function show($id)
    {
        $lead = Lead::with(['assignedAgent', 'activities' => function($query) {
            $query->orderBy('created_at', 'desc');
        }, 'customer'])->find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead not found'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $lead
        ]);
    }

    /**
     * Update the specified lead
     * PUT /api/v2/website-admin/crm/leads/{id}
     */
    public function update(Request $request, $id)
    {
        $lead = Lead::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead not found'
            ], 404);
        }

        $validated = $request->validate([
            'status' => 'sometimes|in:new,contacted,qualified,proposal,negotiation,converted,lost',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'sometimes|nullable|integer|exists:users,id',
            'notes' => 'sometimes|nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $lead->update($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lead updated successfully',
                'data' => $lead->load('assignedAgent')
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update lead: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified lead
     * DELETE /api/v2/website-admin/crm/leads/{id}
     */
    public function destroy($id)
    {
        $lead = Lead::find($id);

        if (!$lead) {
            return response()->json([
                'success' => false,
                'message' => 'Lead not found'
            ], 404);
        }

        try {
            $lead->delete();

            return response()->json([
                'success' => true,
                'message' => 'Lead deleted successfully'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete lead'
            ], 500);
        }
    }

    /**
     * Get leads statistics for dashboard
     * GET /api/v2/website-admin/crm/leads/stats
     */
    public function stats()
    {
        $stats = [
            'total' => Lead::count(),
            'new' => Lead::where('status', 'new')->count(),
            'contacted' => Lead::where('status', 'contacted')->count(),
            'qualified' => Lead::where('status', 'qualified')->count(),
            'converted' => Lead::where('status', 'converted')->count(),
            'lost' => Lead::where('status', 'lost')->count(),
            'by_source' => Lead::selectRaw('source, COUNT(*) as count')
                ->groupBy('source')
                ->get()
                ->pluck('count', 'source')
                ->toArray(),
            'unassigned' => Lead::whereNull('assigned_to')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => $stats
        ]);
    }
}
