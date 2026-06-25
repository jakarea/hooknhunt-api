<?php

namespace App\Modules\Affiliate\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Affiliate\Models\Affiliate;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AffiliateController extends Controller
{
    use ApiResponse;

    /**
     * Get all affiliates (for admin).
     * GET /api/v2/crm/affiliates
     */
    public function index(Request $request)
    {
        try {
            $query = Affiliate::with('user')->orderBy('created_at', 'desc');

            if ($request->has('search')) {
                $search = $request->input('search');
                $query->whereHas('user', function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                })->orWhere('referral_code', 'like', "%{$search}%");
            }

            $perPage = $request->input('per_page', 15);
            $affiliates = $query->paginate($perPage);

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
                    'joinedAt' => is_string($affiliate->created_at) ? $affiliate->created_at : $affiliate->created_at->toDateTimeString(),
                    'lastConversionAt' => $affiliate->last_conversion_at ? (is_string($affiliate->last_conversion_at) ? $affiliate->last_conversion_at : $affiliate->last_conversion_at->toDateTimeString()) : null,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $affiliates->items(),
                'pagination' => [
                    'total' => $affiliates->total(),
                    'perPage' => $affiliates->perPage(),
                    'currentPage' => $affiliates->currentPage(),
                    'lastPage' => $affiliates->lastPage(),
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliates', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to fetch affiliates', [], 500);
        }
    }

    /**
     * Get single affiliate (for admin).
     * GET /api/v2/crm/affiliates/{id}
     */
    public function show($id, Request $request)
    {
        try {
            $affiliate = Affiliate::with([
                'user',
                'earnings',
                'payouts',
                'referrals',
                'productCommissions',
                'categoryCommissions'
            ])->findOrFail($id);

            // Get period from request (default: 30days)
            $period = $request->query('period', '30days');
            $dateFrom = match($period) {
                '7days' => now()->subDays(7),
                '90days' => now()->subDays(90),
                '1year' => now()->subYear(),
                default => now()->subDays(30),
            };

            // Get period earnings and referrals
            $periodEarnings = $affiliate->earnings()
                ->where('created_at', '>=', $dateFrom)
                ->where('status', 'paid')
                ->sum('commission_amount');

            $periodReferrals = $affiliate->referrals()
                ->where('clicked_at', '>=', $dateFrom)
                ->get();

            $periodClicks = $periodReferrals->count();
            $periodConversions = $periodReferrals->where('status', 'converted')->count();
            $periodConversionRate = $periodClicks > 0 ? round(($periodConversions / $periodClicks) * 100, 2) : 0;

            // Get recent earnings and payouts
            $recentEarnings = $affiliate->earnings()
                ->latest()
                ->limit(10)
                ->get()
                ->map(function ($earning) {
                    return [
                        'id' => $earning->id,
                        'orderInvoice' => $earning->order_invoice ?? 'N/A',
                        'orderAmount' => (float) $earning->order_amount,
                        'commissionAmount' => (float) $earning->commission_amount,
                        'status' => $earning->status,
                        'createdAt' => is_string($earning->created_at) ? $earning->created_at : $earning->created_at->toDateTimeString(),
                        'customerName' => $earning->customer_name,
                        'customerEmail' => $earning->customer_email,
                    ];
                });

            $recentPayouts = $affiliate->payouts()
                ->latest()
                ->limit(10)
                ->get()
                ->map(function ($payout) {
                    return [
                        'id' => $payout->id,
                        'amount' => (float) $payout->amount,
                        'paymentMethod' => $payout->payment_method,
                        'status' => $payout->status,
                        'createdAt' => is_string($payout->created_at) ? $payout->created_at : $payout->created_at->toDateTimeString(),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
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
                    'joinedAt' => is_string($affiliate->created_at) ? $affiliate->created_at : $affiliate->created_at->toDateTimeString(),
                    'lastConversionAt' => $affiliate->last_conversion_at ? (is_string($affiliate->last_conversion_at) ? $affiliate->last_conversion_at : $affiliate->last_conversion_at->toDateTimeString()) : null,
                    'periodStats' => [
                        'period' => $period,
                        'clicks' => $periodClicks,
                        'conversions' => $periodConversions,
                        'earnings' => (float) $periodEarnings,
                        'conversionRate' => $periodConversionRate,
                    ],
                    'recentEarnings' => $recentEarnings,
                    'recentPayouts' => $recentPayouts,
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
            Log::error('Failed to fetch affiliate', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to fetch affiliate', [], 500);
        }
    }

    /**
     * Check if authenticated user is an affiliate
     * GET /api/v2/affiliate/check
     */
    public function check()
    {
        $user = auth()->user();

        if (!$user) {
            return $this->sendError('User not authenticated', [], 401);
        }

        $affiliate = Affiliate::where('user_id', $user->id)->first();

        if (!$affiliate) {
            return response()->json([
                'success' => false,
                'is_affiliate' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'is_affiliate' => true,
            'data' => [
                'id' => $affiliate->id,
                'referral_code' => $affiliate->referral_code,
                'commission_rate' => $affiliate->commission_rate,
                'is_approved' => $affiliate->is_approved,
            ],
        ]);
    }

    /**
     * 1. Join Affiliate Program
     */
    public function joinProgram(Request $request)
    {
        $user = auth()->user();

        // Check if already an affiliate
        if (Affiliate::where('user_id', $user->id)->exists()) {
            return $this->sendError('You are already an affiliate member.');
        }

        $affiliate = Affiliate::create([
            'user_id' => $user->id,
            'referral_code' => Affiliate::generateUniqueReferralCode(),
            'commission_rate' => 5.00, // Default 5%
            'is_approved' => true // Or false if manual approval needed
        ]);

        return $this->sendSuccess($affiliate, 'Welcome to Affiliate Program!');
    }

    /**
     * 2. Affiliate Dashboard (Earnings & Stats)
     */
    public function dashboard(Request $request)
    {
        $affiliate = Affiliate::where('user_id', auth()->id())->firstOrFail();

        $stats = [
            'referral_code' => $affiliate->referral_code,
            'referral_link' => url('/?ref=' . $affiliate->referral_code),
            'commission_rate' => $affiliate->commission_rate . '%',
            'total_earned' => $affiliate->total_earned,
            'balance' => $affiliate->total_earned - $affiliate->withdrawn_amount,
            'recent_orders' => DB::table('affiliate_earnings')
                                ->where('affiliate_id', $affiliate->id)
                                ->orderBy('created_at', 'desc')
                                ->limit(10)
                                ->get()
        ];

        return $this->sendSuccess($stats);
    }

    /**
     * Create a new affiliate (for admin).
     * POST /api/v2/crm/affiliates
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'user_id' => 'required|integer|exists:users,id|unique:affiliates,user_id',
                'commission_rate' => 'required|numeric|min:0|max:100',
            ]);

            $affiliate = Affiliate::create([
                'user_id' => $validated['user_id'],
                'referral_code' => Affiliate::generateUniqueReferralCode(),
                'commission_rate' => $validated['commission_rate'],
                'is_approved' => false,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Affiliate created successfully',
                'data' => $this->formatAffiliate($affiliate),
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to create affiliate', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to create affiliate', [], 500);
        }
    }

    /**
     * Update affiliate (for admin).
     * PUT /api/v2/crm/affiliates/{id}
     */
    public function update(Request $request, $id)
    {
        try {
            $affiliate = Affiliate::with('user')->findOrFail($id);

            $validated = $request->validate([
                'commission_rate' => 'sometimes|numeric|min:0|max:100',
                'is_approved' => 'sometimes|boolean',
            ]);

            $affiliate->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Affiliate updated successfully',
                'data' => $this->formatAffiliate($affiliate),
            ]);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Affiliate not found',
            ], 404);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            Log::error('Failed to update affiliate', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to update affiliate', [], 500);
        }
    }

    /**
     * Delete affiliate (for admin).
     * DELETE /api/v2/crm/affiliates/{id}
     */
    public function destroy($id)
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
            return $this->sendError('Failed to delete affiliate', [], 500);
        }
    }

    /**
     * Format affiliate data for API response.
     */
    private function formatAffiliate(Affiliate $affiliate)
    {
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
            'joinedAt' => $affiliate->created_at->toDateTimeString(),
            'lastConversionAt' => $affiliate->last_conversion_at?->toDateTimeString(),
        ];
    }

    /**
     * Award loyalty points for an order using direct database access.
     * Uses order ID instead of model relationship for module independence.
     *
     * @param int $orderId The sales order ID
     * @return void
     */
    public function awardPoints(int $orderId): void
    {
        // Get order data using direct database access for module independence
        $order = DB::table('sales_orders')->where('id', $orderId)->first();

        if (!$order) {
            Log::warning("Award points failed: Order #{$orderId} not found");
            return;
        }

        // 1. Validation: Guest orders or already processed orders don't get points
        if (!$order->customer_id) {
            Log::info("Award points skipped: Order #{$orderId} has no customer (guest order)");
            return;
        }

        // Check if points already awarded for this order to prevent duplicates
        $exists = DB::table('loyalty_transactions')
            ->where('sales_order_id', $orderId)
            ->where('type', 'earned')
            ->exists();

        if ($exists) {
            Log::info("Award points skipped: Order #{$orderId} already processed");
            return;
        }

        // 2. Find Best Matching Rule (Highest minimum amount rule applies)
        $rule = DB::table('loyalty_rules')
            ->where('is_active', 1)
            ->where('min_order_amount', '<=', $order->total_amount)
            ->orderBy('min_order_amount', 'desc')
            ->first();

        if (!$rule) {
            Log::info("Award points skipped: No matching loyalty rule for Order #{$orderId}");
            return;
        }

        // 3. Calculate Points
        // Example: Order 2500 Tk, Rule: 1 Point per 100 Tk. Points = 25
        $points = floor(($order->total_amount / 100) * $rule->points_per_100_taka);

        if ($points > 0) {
            // 4. Record Transaction using direct database access
            DB::table('loyalty_transactions')->insert([
                'customer_id'       => $order->customer_id,
                'sales_order_id'    => $orderId,
                'type'              => 'earned',
                'points'            => $points,
                'equivalent_amount' => 0, // Future feature: Cash value of points
                'description'       => "Earned from Order #{$order->invoice_no}",
                'created_at'        => now(),
                'updated_at'        => now(),
            ]);

            Log::info("Loyalty: Awarded {$points} points to Customer {$order->customer_id} for Order #{$orderId}");
        }
    }
}