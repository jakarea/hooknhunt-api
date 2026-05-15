<?php

namespace App\Http\Controllers\Api\V2\Admin;

use App\Http\Controllers\Controller;
use App\Models\AffiliatePayout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PayoutController extends Controller
{
    /**
     * Get all payout requests.
     * GET /api/v2/admin/affiliate-payouts
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = AffiliatePayout::with(['affiliate.user', 'approvedByAdmin', 'rejectedByAdmin'])
                ->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->input('status'));
            }

            // Filter by affiliate
            if ($request->has('affiliate_id')) {
                $query->where('affiliate_id', $request->input('affiliate_id'));
            }

            // Search by affiliate name
            if ($request->has('search') && !empty($request->input('search'))) {
                $searchTerm = $request->input('search');
                $query->whereHas('affiliate.user', function ($q) use ($searchTerm) {
                    $q->where('name', 'like', '%' . $searchTerm . '%');
                });
            }

            $perPage = $request->input('per_page', 20);
            $payouts = $query->paginate($perPage);

            $payouts->getCollection()->transform(function ($payout) {
                return [
                    'id' => $payout->id,
                    'affiliate_id' => $payout->affiliate_id,
                    'affiliate_name' => $payout->affiliate?->user?->name ?? 'N/A',
                    'amount' => (float) $payout->amount,
                    'payment_method' => $payout->payment_method,
                    'payment_details' => $payout->payment_details,
                    'status' => $payout->status,
                    'admin_notes' => $payout->admin_notes,
                    'rejection_reason' => $payout->rejection_reason,
                    'approved_at' => $payout->approved_at?->toDateTimeString(),
                    'completed_at' => $payout->completed_at?->toDateTimeString(),
                    'created_at' => $payout->created_at->toDateTimeString(),
                    'approved_by' => $payout->approvedByAdmin?->name ?? null,
                    'rejected_by' => $payout->rejectedByAdmin?->name ?? null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'payouts' => $payouts->items(),
                    'pagination' => [
                        'total' => $payouts->total(),
                        'per_page' => $payouts->perPage(),
                        'current_page' => $payouts->currentPage(),
                        'last_page' => $payouts->lastPage(),
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch payouts', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payouts',
            ], 500);
        }
    }

    /**
     * Approve payout request.
     * POST /api/v2/admin/affiliate-payouts/{id}/approve
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'admin_notes' => 'nullable|string|max:1000',
            ]);

            $payout = AffiliatePayout::findOrFail($id);
            $adminId = auth()->id();

            $payout->markAsApproved($adminId);

            if (isset($validated['admin_notes'])) {
                $payout->update(['admin_notes' => $validated['admin_notes']]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Payout approved successfully',
                'data' => [
                    'id' => $payout->id,
                    'status' => $payout->status,
                    'approved_at' => $payout->approved_at->toDateTimeString(),
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payout not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to approve payout', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve payout',
            ], 500);
        }
    }

    /**
     * Reject payout request.
     * POST /api/v2/admin/affiliate-payouts/{id}/reject
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'rejection_reason' => 'required|string|max:500',
                'admin_notes' => 'nullable|string|max:1000',
            ]);

            $payout = AffiliatePayout::findOrFail($id);
            $adminId = auth()->id();

            $payout->markAsRejected($adminId, $validated['rejection_reason']);

            if (isset($validated['admin_notes'])) {
                $payout->update(['admin_notes' => $validated['admin_notes']]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Payout rejected',
                'data' => [
                    'id' => $payout->id,
                    'status' => $payout->status,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payout not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to reject payout', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject payout',
            ], 500);
        }
    }

    /**
     * Mark payout as completed.
     * POST /api/v2/admin/affiliate-payouts/{id}/complete
     */
    public function markCompleted($id): JsonResponse
    {
        try {
            $payout = AffiliatePayout::findOrFail($id);

            $payout->markAsCompleted();

            // Update affiliate's withdrawn amount
            $payout->affiliate->increment('withdrawn_amount', $payout->amount);

            return response()->json([
                'success' => true,
                'message' => 'Payout marked as completed',
                'data' => [
                    'id' => $payout->id,
                    'status' => $payout->status,
                    'completed_at' => $payout->completed_at->toDateTimeString(),
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payout not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to complete payout', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to mark payout as completed',
            ], 500);
        }
    }

    /**
     * Mark payout as processing.
     * POST /api/v2/admin/affiliate-payouts/{id}/process
     */
    public function markAsProcessing($id): JsonResponse
    {
        try {
            $payout = AffiliatePayout::findOrFail($id);

            $payout->markAsProcessing();

            return response()->json([
                'success' => true,
                'message' => 'Payout marked as processing',
                'data' => [
                    'id' => $payout->id,
                    'status' => $payout->status,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Payout not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to mark payout as processing', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update payout status',
            ], 500);
        }
    }
}
