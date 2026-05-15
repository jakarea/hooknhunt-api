<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Models\Affiliate;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AffiliateController extends Controller
{
    /**
     * Apply to become an affiliate.
     * POST /api/v2/store/affiliate/apply
     */
    public function apply(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'phone' => 'required|string|max:20',
                'email' => 'required|email|max:255',
                'address' => 'nullable|string|max:500',
                'why_join' => 'nullable|string|max:1000',
            ]);

            $userId = auth()->id();
            $user = User::find($userId);

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                ], 404);
            }

            // Check if user already has an affiliate account
            $existingAffiliate = Affiliate::where('user_id', $userId)->first();
            if ($existingAffiliate) {
                $message = $existingAffiliate->is_approved
                    ? 'You are already an approved affiliate.'
                    : 'Your affiliate application is already pending approval.';

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'data' => [
                        'is_approved' => $existingAffiliate->is_approved,
                        'referral_code' => $existingAffiliate->referral_code,
                    ],
                ], 400);
            }

            // Generate unique referral code
            $referralCode = $this->generateUniqueReferralCode();
            $commissionRate = 5.00; // Default commission rate

            // Create affiliate account
            $affiliate = Affiliate::create([
                'user_id' => $userId,
                'referral_code' => $referralCode,
                'commission_rate' => $commissionRate,
                'total_earned' => 0,
                'withdrawn_amount' => 0,
                'total_clicks' => 0,
                'total_conversions' => 0,
                'is_approved' => false, // Requires admin approval
            ]);

            Log::info('New affiliate application', [
                'affiliate_id' => $affiliate->id,
                'user_id' => $userId,
                'name' => $validated['name'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Your affiliate application has been submitted successfully. We will review your application and notify you once approved.',
                'data' => [
                    'affiliate_id' => $affiliate->id,
                    'referral_code' => $affiliate->referral_code,
                    'referral_link' => url('/?ref=' . $affiliate->referral_code),
                    'is_approved' => false,
                ],
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to create affiliate application', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit your application. Please try again.',
            ], 500);
        }
    }

    /**
     * Get affiliate dashboard data for logged-in affiliate.
     * GET /api/v2/store/affiliate/dashboard
     */
    public function dashboard(Request $request): JsonResponse
    {
        try {
            $userId = auth()->id();
            $affiliate = Affiliate::with('user')->where('user_id', $userId)->first();

            if (!$affiliate) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not registered as an affiliate.',
                ], 404);
            }

            if (!$affiliate->is_approved) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your affiliate application is still pending approval.',
                    'data' => [
                        'is_approved' => false,
                        'applied_at' => $affiliate->created_at->toDateTimeString(),
                    ],
                ], 403);
            }

            // Get recent referrals
            $recentReferrals = $affiliate->referrals()
                ->with('order')
                ->orderBy('clicked_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($referral) {
                    return [
                        'id' => $referral->id,
                        'ip_address' => $referral->ip_address,
                        'clicked_at' => $referral->clicked_at->toDateTimeString(),
                        'converted_at' => $referral->converted_at?->toDateTimeString(),
                        'order_amount' => $referral->order_amount ? (float) $referral->order_amount : null,
                        'commission_amount' => $referral->commission_amount ? (float) $referral->commission_amount : null,
                        'status' => $referral->status,
                    ];
                });

            // Get recent earnings
            $recentEarnings = $affiliate->earnings()
                ->with('order')
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($earning) {
                    return [
                        'id' => $earning->id,
                        'order_invoice' => $earning->order?->invoice_no ?? 'N/A',
                        'order_amount' => (float) $earning->order_amount,
                        'commission_amount' => (float) $earning->commission_amount,
                        'status' => $earning->status,
                        'created_at' => $earning->created_at->toDateTimeString(),
                    ];
                });

            // Get active product commissions
            $productCommissions = $affiliate->productCommissions()
                ->where('is_active', true)
                ->with('product')
                ->get()
                ->map(function ($commission) {
                    return [
                        'id' => $commission->id,
                        'product_id' => $commission->product_id,
                        'product_name' => $commission->product?->name ?? 'N/A',
                        'commission_rate' => (float) $commission->commission_rate,
                    ];
                });

            // Get active category commissions
            $categoryCommissions = $affiliate->categoryCommissions()
                ->where('is_active', true)
                ->with('category')
                ->get()
                ->map(function ($commission) {
                    return [
                        'id' => $commission->id,
                        'category_id' => $commission->category_id,
                        'category_name' => $commission->category?->name ?? 'N/A',
                        'commission_rate' => (float) $commission->commission_rate,
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'affiliate' => [
                        'id' => $affiliate->id,
                        'referral_code' => $affiliate->referral_code,
                        'referral_link' => url('/?ref=' . $affiliate->referral_code),
                        'commission_rate' => (float) $affiliate->commission_rate,
                        'total_earned' => (float) $affiliate->total_earned,
                        'withdrawn_amount' => (float) $affiliate->withdrawn_amount,
                        'available_balance' => (float) $affiliate->available_balance,
                        'total_clicks' => $affiliate->total_clicks,
                        'total_conversions' => $affiliate->total_conversions,
                        'conversion_rate' => $affiliate->conversion_rate,
                        'is_approved' => $affiliate->is_approved,
                    ],
                    'recent_referrals' => $recentReferrals,
                    'recent_earnings' => $recentEarnings,
                    'product_commissions' => $productCommissions,
                    'category_commissions' => $categoryCommissions,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate dashboard', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load dashboard data.',
            ], 500);
        }
    }

    /**
     * Request payout.
     * POST /api/v2/store/affiliate/payout-request
     */
    public function requestPayout(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'amount' => 'required|numeric|min:100',
                'payment_method' => 'required|in:bank_transfer,bkash,nagad,rocket,other',
                'payment_details' => 'required|string|max:500',
            ]);

            $userId = auth()->id();
            $affiliate = Affiliate::where('user_id', $userId)->first();

            if (!$affiliate) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are not registered as an affiliate.',
                ], 404);
            }

            if (!$affiliate->is_approved) {
                return response()->json([
                    'success' => false,
                    'message' => 'Your affiliate application is still pending approval.',
                ], 403);
            }

            $availableBalance = $affiliate->available_balance;

            if ($validated['amount'] > $availableBalance) {
                return response()->json([
                    'success' => false,
                    'message' => "Insufficient balance. Your available balance is ৳{$availableBalance}",
                ], 400);
            }

            // Create payout request
            $payout = $affiliate->payouts()->create([
                'amount' => $validated['amount'],
                'payment_method' => $validated['payment_method'],
                'payment_details' => $validated['payment_details'],
                'status' => 'pending',
            ]);

            Log::info('Affiliate payout requested', [
                'affiliate_id' => $affiliate->id,
                'payout_id' => $payout->id,
                'amount' => $validated['amount'],
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payout request submitted successfully.',
                'data' => [
                    'payout_id' => $payout->id,
                    'amount' => (float) $payout->amount,
                    'status' => $payout->status,
                ],
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to create payout request', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to submit payout request. Please try again.',
            ], 500);
        }
    }

    /**
     * Generate unique referral code.
     */
    private function generateUniqueReferralCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
            $exists = Affiliate::where('referral_code', $code)->exists();
        } while ($exists);

        return $code;
    }
}
