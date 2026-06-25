<?php

namespace App\Modules\Affiliate\Http\Controllers\Api\V2\Admin;

use App\Http\Controllers\Controller;
use App\Modules\Affiliate\Models\Affiliate;
use App\Modules\Affiliate\Models\AffiliateEarning;
use App\Modules\Affiliate\Models\AffiliatePayout;
use App\Modules\Affiliate\Models\AffiliateReferral;
use App\Modules\System\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AdminAffiliateController extends Controller
{
    /**
     * Get all affiliates with stats and filters.
     * GET /api/v2/admin/affiliates
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $query = Affiliate::with('user')->orderBy('created_at', 'desc');

            // Filter by status
            $status = $request->query('status');
            if ($status && $status !== 'all') {
                switch ($status) {
                    case 'pending':
                        $query->where('is_approved', false)->whereNull('rejection_reason');
                        break;
                    case 'approved':
                        $query->where('is_approved', true);
                        break;
                    case 'rejected':
                        $query->whereNotNull('rejection_reason');
                        break;
                }
            }

            // Filter by search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                })->orWhere('referral_code', 'like', "%{$search}%");
            }

            $perPage = $request->input('per_page', 15);
            $page = $request->input('page', 1);
            $affiliates = $query->paginate($perPage, ['*'], 'page', $page);

            // Load stats for each affiliate
            $affiliates->getCollection()->transform(function ($affiliate) {
                return [
                    'id' => $affiliate->id,
                    'userId' => $affiliate->user_id,
                    'name' => $affiliate->user?->name ?? 'N/A',
                    'email' => $affiliate->user?->email ?? 'N/A',
                    'phone' => $affiliate->user?->phone_number ?? 'N/A',
                    'referralCode' => $affiliate->referral_code,
                    'referralLink' => url('/?ref=' . $affiliate->referral_code),
                    'commissionRate' => (float) $affiliate->commission_rate,
                    'totalEarned' => (float) $affiliate->total_earned,
                    'withdrawnAmount' => (float) $affiliate->withdrawn_amount,
                    'availableBalance' => (float) $affiliate->available_balance,
                    'totalClicks' => $affiliate->total_clicks,
                    'totalConversions' => $affiliate->total_conversions,
                    'conversionRate' => $affiliate->conversion_rate,
                    'isApproved' => $affiliate->is_approved,
                    'rejectionReason' => $affiliate->rejection_reason,
                    'adminNotes' => $affiliate->admin_notes,
                    'approvedAt' => $affiliate->approved_at ? (is_string($affiliate->approved_at) ? $affiliate->approved_at : $affiliate->approved_at->toDateTimeString()) : null,
                    'approvedBy' => $affiliate->approved_by,
                    'joinedAt' => is_string($affiliate->created_at) ? $affiliate->created_at : $affiliate->created_at->toDateTimeString(),
                    'lastConversionAt' => $affiliate->last_conversion_at ? (is_string($affiliate->last_conversion_at) ? $affiliate->last_conversion_at : $affiliate->last_conversion_at->toDateTimeString()) : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'affiliates' => $affiliates->items(),
                    'pagination' => [
                        'total' => $affiliates->total(),
                        'per_page' => $affiliates->perPage(),
                        'current_page' => $affiliates->currentPage(),
                        'last_page' => $affiliates->lastPage(),
                        'from' => $affiliates->firstItem(),
                        'to' => $affiliates->lastItem(),
                    ],
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliates', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch affiliates',
            ], 500);
        }
    }

    /**
     * Get affiliate dashboard stats.
     * GET /api/v2/admin/affiliates/stats
     */
    public function getStats(): JsonResponse
    {
        try {
            $stats = [
                'total_affiliates' => Affiliate::count(),
                'active_affiliates' => Affiliate::where('is_approved', true)->count(),
                'pending_affiliates' => Affiliate::where('is_approved', false)->count(),
                'total_earned' => (float) Affiliate::sum('total_earned'),
                'total_withdrawn' => (float) Affiliate::sum('withdrawn_amount'),
                'total_pending_payouts' => (float) AffiliatePayout::pending()->sum('amount'),
                'total_completed_payouts' => (float) AffiliatePayout::completed()->sum('amount'),
                'total_clicks' => AffiliateReferral::count(),
                'total_conversions' => AffiliateReferral::converted()->count(),
                'this_month_earnings' => (float) AffiliateEarning::whereMonth('created_at', now()->month)
                    ->whereYear('created_at', now()->year)
                    ->sum('commission_amount'),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate stats', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch stats',
            ], 500);
        }
    }

    /**
     * Get single affiliate details.
     * GET /api/v2/admin/affiliates/{id}
     */
    public function show(Request $request, $id): JsonResponse
    {
        try {
            $affiliate = Affiliate::with(['user', 'payouts', 'productCommissions', 'categoryCommissions'])
                ->findOrFail($id);

            // Get period from request (default: 30days)
            $period = $request->query('period', '30days');
            $dateFrom = match($period) {
                '7days' => now()->subDays(7),
                '90days' => now()->subDays(90),
                '1year' => now()->subYear(),
                default => now()->subDays(30), // 30days is default
            };

            // Calculate period-specific stats
            $periodClicks = $affiliate->referrals()
                ->where('clicked_at', '>=', $dateFrom)
                ->count();

            $periodConversions = $affiliate->referrals()
                ->where('clicked_at', '>=', $dateFrom)
                ->where('status', 'converted')
                ->count();

            $periodEarnings = AffiliateEarning::where('affiliate_id', $affiliate->id)
                ->where('created_at', '>=', $dateFrom)
                ->where('status', 'paid')
                ->sum('commission_amount');

            $periodConversionRate = $periodClicks > 0 ? round(($periodConversions / $periodClicks) * 100, 2) : 0;

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $affiliate->id,
                    'userId' => $affiliate->user_id,
                    'name' => $affiliate->user?->name ?? 'N/A',
                    'email' => $affiliate->user?->email ?? 'N/A',
                    'phone' => $affiliate->user?->phone ?? 'N/A',
                    'referralCode' => $affiliate->referral_code,
                    'referralLink' => url('/?ref=' . $affiliate->referral_code),
                    'commissionRate' => (float) $affiliate->commission_rate,
                    'totalEarned' => (float) $affiliate->total_earned,
                    'withdrawnAmount' => (float) $affiliate->withdrawn_amount,
                    'availableBalance' => (float) $affiliate->available_balance,
                    'totalClicks' => $affiliate->total_clicks,
                    'totalConversions' => $affiliate->total_conversions,
                    'conversionRate' => $affiliate->conversion_rate,
                    'isApproved' => $affiliate->is_approved,
                    'joinedAt' => is_string($affiliate->created_at) ? $affiliate->created_at : $affiliate->created_at->toDateTimeString(),
                    'lastConversionAt' => $affiliate->last_conversion_at ? (is_string($affiliate->last_conversion_at) ? $affiliate->last_conversion_at : $affiliate->last_conversion_at->toDateTimeString()) : null,
                    'periodStats' => [
                        'period' => $period,
                        'clicks' => $periodClicks,
                        'conversions' => $periodConversions,
                        'earnings' => (float) $periodEarnings,
                        'conversionRate' => $periodConversionRate,
                    ],
                    'productCommissions' => $affiliate->productCommissions->map(fn ($c) => [
                        'id' => $c->id,
                        'productId' => $c->product_id,
                        'productName' => $c->product?->name ?? 'N/A',
                        'commissionRate' => (float) $c->commission_rate,
                        'isActive' => $c->is_active,
                    ]),
                    'categoryCommissions' => $affiliate->categoryCommissions->map(fn ($c) => [
                        'id' => $c->id,
                        'categoryId' => $c->category_id,
                        'categoryName' => $c->category?->name ?? 'N/A',
                        'commissionRate' => (float) $c->commission_rate,
                        'isActive' => $c->is_active,
                    ]),
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate details', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch affiliate details',
            ], 500);
        }
    }

    /**
     * Update affiliate (approve, reject, change rate, edit referral code).
     * PUT /api/v2/admin/affiliates/{id}
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'commission_rate' => 'nullable|numeric|min:0|max:100',
                'admin_notes' => 'nullable|string|max:1000',
                'is_approved' => 'nullable|boolean',
                'referral_code' => 'nullable|string|max:20|unique:affiliates,referral_code,' . $id,
            ]);

            $affiliate = Affiliate::findOrFail($id);

            DB::beginTransaction();

            // Update commission rate
            if (isset($validated['commission_rate'])) {
                $affiliate->commission_rate = $validated['commission_rate'];
            }

            // Update admin notes
            if (isset($validated['admin_notes'])) {
                $affiliate->admin_notes = $validated['admin_notes'];
            }

            // Update approval status
            if (isset($validated['is_approved'])) {
                $affiliate->is_approved = $validated['is_approved'];
                if ($affiliate->is_approved) {
                    $affiliate->approved_at = now();
                    $affiliate->approved_by = auth()->id();
                    $affiliate->rejection_reason = null;
                }
            }

            // Update referral code
            if (isset($validated['referral_code'])) {
                // Ensure referral code is uppercase
                $affiliate->referral_code = strtoupper($validated['referral_code']);
            }

            $affiliate->save();

            DB::commit();

            Log::info('Affiliate updated by admin', [
                'affiliate_id' => $affiliate->id,
                'admin_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Affiliate updated successfully',
                'data' => [
                    'id' => $affiliate->id,
                    'is_approved' => $affiliate->is_approved,
                    'referral_code' => $affiliate->referral_code,
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update affiliate', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update affiliate',
            ], 500);
        }
    }

    /**
     * Delete affiliate.
     * DELETE /api/v2/admin/affiliates/{id}
     */
    public function destroy($id): JsonResponse
    {
        try {
            $affiliate = Affiliate::findOrFail($id);
            $affiliate->delete();

            return response()->json([
                'success' => true,
                'message' => 'Affiliate deleted successfully',
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to delete affiliate', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete affiliate',
            ], 500);
        }
    }

    /**
     * Get affiliate earnings history.
     * GET /api/v2/admin/affiliates/{id}/earnings
     */
    public function getEarnings(Request $request, $id): JsonResponse
    {
        try {
            $affiliate = Affiliate::findOrFail($id);

            $query = $affiliate->earnings()->with('order')->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->input('status'));
            }

            // Filter by date range
            if ($request->has('date_from')) {
                $query->where('created_at', '>=', $request->input('date_from'));
            }
            if ($request->has('date_to')) {
                $query->where('created_at', '<=', $request->input('date_to'));
            }

            $perPage = $request->input('per_page', 20);
            $earnings = $query->paginate($perPage);

            $earnings->getCollection()->transform(function ($earning) {
                return [
                    'id' => $earning->id,
                    'order_id' => $earning->sales_order_id,
                    'order_invoice' => $earning->order?->invoice_no ?? 'N/A',
                    'order_amount' => (float) ($earning->order_amount ?? 0),
                    'commission_amount' => (float) $earning->commission_amount,
                    'status' => $earning->status,
                    'created_at' => $earning->created_at->toDateTimeString(),
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'earnings' => $earnings->items(),
                    'pagination' => [
                        'total' => $earnings->total(),
                        'per_page' => $earnings->perPage(),
                        'current_page' => $earnings->currentPage(),
                        'last_page' => $earnings->lastPage(),
                    ],
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate earnings', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch earnings',
            ], 500);
        }
    }

    /**
     * Get affiliate payouts.
     * GET /api/v2/admin/affiliates/{id}/payouts
     */
    public function getPayouts(Request $request, $id): JsonResponse
    {
        try {
            $affiliate = Affiliate::findOrFail($id);

            $query = $affiliate->payouts()->orderBy('created_at', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->input('status'));
            }

            $perPage = $request->input('per_page', 20);
            $payouts = $query->paginate($perPage);

            $payouts->getCollection()->transform(function ($payout) {
                return [
                    'id' => $payout->id,
                    'amount' => (float) $payout->amount,
                    'payment_method' => $payout->payment_method,
                    'payment_details' => $payout->payment_details,
                    'status' => $payout->status,
                    'admin_notes' => $payout->admin_notes,
                    'rejection_reason' => $payout->rejection_reason,
                    'approved_at' => $payout->approved_at?->toDateTimeString(),
                    'completed_at' => $payout->completed_at?->toDateTimeString(),
                    'created_at' => $payout->created_at->toDateTimeString(),
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

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate payouts', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payouts',
            ], 500);
        }
    }

    /**
     * Get affiliate referral tracking data.
     * GET /api/v2/admin/affiliates/{id}/referrals
     */
    public function getReferrals(Request $request, $id): JsonResponse
    {
        try {
            $affiliate = Affiliate::findOrFail($id);

            $query = $affiliate->referrals()->with('order')->orderBy('clicked_at', 'desc');

            // Filter by status
            if ($request->has('status')) {
                $query->where('status', $request->input('status'));
            }

            // Filter by date range
            if ($request->has('date_from')) {
                $query->where('clicked_at', '>=', $request->input('date_from'));
            }
            if ($request->has('date_to')) {
                $query->where('clicked_at', '<=', $request->input('date_to'));
            }

            $perPage = $request->input('per_page', 50);
            $referrals = $query->paginate($perPage);

            $referrals->getCollection()->transform(function ($referral) {
                return [
                    'id' => $referral->id,
                    'referral_code' => $referral->referral_code,
                    'ip_address' => $referral->ip_address,
                    'landing_page' => $referral->landing_page,
                    'clicked_at' => $referral->clicked_at->toDateTimeString(),
                    'converted_at' => $referral->converted_at?->toDateTimeString(),
                    'order_id' => $referral->sales_order_id,
                    'order_invoice' => $referral->order?->invoice_no ?? 'N/A',
                    'order_amount' => $referral->order_amount ? (float) $referral->order_amount : null,
                    'commission_amount' => $referral->commission_amount ? (float) $referral->commission_amount : null,
                    'status' => $referral->status,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => [
                    'referrals' => $referrals->items(),
                    'pagination' => [
                        'total' => $referrals->total(),
                        'per_page' => $referrals->perPage(),
                        'current_page' => $referrals->currentPage(),
                        'last_page' => $referrals->lastPage(),
                    ],
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate referrals', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch referrals',
            ], 500);
        }
    }

    /**
     * Approve affiliate.
     * POST /api/v2/admin/affiliates/{id}/approve
     */
    public function approve(Request $request, $id): JsonResponse
    {
        try {
            $affiliate = Affiliate::findOrFail($id);

            if ($affiliate->is_approved) {
                return response()->json([
                    'success' => false,
                    'message' => 'Affiliate is already approved',
                ], 400);
            }

            DB::beginTransaction();

            $affiliate->is_approved = true;
            $affiliate->approved_at = now();
            $affiliate->approved_by = auth()->id();
            $affiliate->rejection_reason = null;

            // Set custom commission rate if provided
            if ($request->has('commission_rate')) {
                $commissionRate = $request->input('commission_rate');
                if ($commissionRate >= 0 && $commissionRate <= 100) {
                    $affiliate->commission_rate = $commissionRate;
                }
            }

            $affiliate->save();

            DB::commit();

            Log::info('Affiliate approved by admin', [
                'affiliate_id' => $affiliate->id,
                'admin_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Affiliate approved successfully',
                'data' => [
                    'id' => $affiliate->id,
                    'is_approved' => true,
                ],
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to approve affiliate', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to approve affiliate',
            ], 500);
        }
    }

    /**
     * Reject affiliate.
     * POST /api/v2/admin/affiliates/{id}/reject
     */
    public function reject(Request $request, $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'rejection_reason' => 'nullable|string|max:500',
            ]);

            $affiliate = Affiliate::findOrFail($id);

            if (!$affiliate->is_approved && $affiliate->rejection_reason) {
                return response()->json([
                    'success' => false,
                    'message' => 'Affiliate is already rejected',
                ], 400);
            }

            DB::beginTransaction();

            $affiliate->is_approved = false;
            $affiliate->rejection_reason = $validated['rejection_reason'] ?? 'No reason provided';
            $affiliate->approved_at = null;
            $affiliate->approved_by = null;
            $affiliate->save();

            DB::commit();

            Log::info('Affiliate rejected by admin', [
                'affiliate_id' => $affiliate->id,
                'admin_id' => auth()->id(),
                'reason' => $affiliate->rejection_reason,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Affiliate rejected successfully',
                'data' => [
                    'id' => $affiliate->id,
                    'is_approved' => false,
                    'rejection_reason' => $affiliate->rejection_reason,
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reject affiliate', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to reject affiliate',
            ], 500);
        }
    }

    /**
     * Create affiliate from existing user.
     * POST /api/v2/admin/affiliates/create-from-user
     */
    public function createFromUser(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
                'commission_rate' => 'nullable|numeric|min:0|max:100',
                'auto_approve' => 'boolean',
            ]);

            // Check if user already has an affiliate account
            $existingAffiliate = Affiliate::where('user_id', $validated['user_id'])->first();
            if ($existingAffiliate) {
                return response()->json([
                    'success' => false,
                    'message' => 'This user already has an affiliate account.',
                    'data' => [
                        'affiliate_id' => $existingAffiliate->id,
                        'referral_code' => $existingAffiliate->referral_code,
                    ],
                ], 400);
            }

            $user = User::find($validated['user_id']);

            // Generate unique referral code (2 letters + 4 digits)
            $referralCode = Affiliate::generateUniqueReferralCode();
            $commissionRate = $validated['commission_rate'] ?? 5.00;

            // Create affiliate account
            $affiliate = Affiliate::create([
                'user_id' => $validated['user_id'],
                'referral_code' => $referralCode,
                'commission_rate' => $commissionRate,
                'total_earned' => 0,
                'withdrawn_amount' => 0,
                'total_clicks' => 0,
                'total_conversions' => 0,
                'is_approved' => $validated['auto_approve'] ?? false,
            ]);

            Log::info('Affiliate created from user by admin', [
                'affiliate_id' => $affiliate->id,
                'user_id' => $validated['user_id'],
                'admin_id' => auth()->id(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Affiliate account created successfully.',
                'data' => [
                    'id' => $affiliate->id,
                    'user_id' => $affiliate->user_id,
                    'user_name' => $user->name,
                    'referral_code' => $affiliate->referral_code,
                    'referral_link' => url('/?ref=' . $affiliate->referral_code),
                    'commission_rate' => (float) $affiliate->commission_rate,
                    'is_approved' => $affiliate->is_approved,
                ],
            ], 201);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to create affiliate from user', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create affiliate account.',
            ], 500);
        }
    }

    /**
     * Get users who are not affiliates yet.
     * GET /api/v2/admin/users/not-affiliates
     */
    public function getNonAffiliateUsers(): JsonResponse
    {
        try {
            // Get user IDs that already have affiliate accounts
            $affiliateUserIds = Affiliate::pluck('user_id')->toArray();

            // Get users who don't have an affiliate account
            $query = User::select('id', 'name', 'email', 'phone')
                ->orderBy('name', 'asc');

            // Only apply whereNotIn if there are actual affiliate users
            if (!empty($affiliateUserIds)) {
                $query->whereNotIn('id', $affiliateUserIds);
            }

            $users = $query->get();

            return response()->json([
                'success' => true,
                'data' => $users,
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch non-affiliate users', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users.',
            ], 500);
        }
    }
}
