<?php

namespace App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate;

use App\Http\Controllers\Controller;
use App\Modules\Affiliate\Models\Affiliate;
use App\Modules\Affiliate\Models\AffiliateEarning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WebsiteAffiliateController extends Controller
{
    /**
     * Check if current user is an affiliate.
     * GET /api/v2/store/affiliate/check
     */
    public function check(Request $request): JsonResponse
    {
        try {
            // Get token from Authorization header and authenticate manually
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'is_affiliate' => false,
                    'message' => 'Authorization token required',
                ], 401);
            }

            // Find and validate the token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'is_affiliate' => false,
                    'message' => 'Invalid token',
                ], 401);
            }

            // Get the user from the token
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'is_affiliate' => false,
                    'message' => 'User not found',
                ], 401);
            }

            $userId = $user->id;

            $affiliate = Affiliate::with('user')->where('user_id', $userId)->first();

            if (!$affiliate) {
                return response()->json([
                    'success' => true,
                    'is_affiliate' => false,
                    'message' => 'User is not an affiliate',
                    'data' => null,
                ]);
            }

            return response()->json([
                'success' => true,
                'is_affiliate' => true,
                'message' => $affiliate->is_approved
                    ? 'User is an approved affiliate'
                    : 'Affiliate application is pending approval',
                'data' => [
                    'id' => $affiliate->id,
                    'referral_code' => $affiliate->referral_code,
                    'commission_rate' => (float) $affiliate->commission_rate,
                    'is_approved' => $affiliate->is_approved,
                    'total_earned' => (float) $affiliate->total_earned,
                    'withdrawn_amount' => (float) $affiliate->withdrawn_amount,
                    'available_balance' => (float) $affiliate->available_balance,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to check affiliate status', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to check affiliate status',
            ], 500);
        }
    }

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

            // Get token from Authorization header and authenticate manually
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authorization token required',
                ], 401);
            }

            // Find and validate the token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token',
                ], 401);
            }

            // Get the user from the token
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found',
                ], 404);
            }

            $userId = $user->id;

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
            // Get token from Authorization header and authenticate manually
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authorization token required',
                ], 401);
            }

            // Find and validate the token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token',
                ], 401);
            }

            // Get the user from the token
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            $userId = $user->id;
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

            // Get period from request (default: 30days)
            $period = $request->query('period', '30days');
            $dateFrom = match($period) {
                '7days' => now()->subDays(7),
                '90days' => now()->subDays(90),
                '1year' => now()->subYear(),
                default => now()->subDays(30), // 30days is default
            };

            // Get period-specific referrals
            $recentReferrals = $affiliate->referrals()
                ->where('clicked_at', '>=', $dateFrom)
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
                        'customer_id' => $referral->customer_id,
                        'customer_name' => $referral->customer_name,
                        'customer_email' => $referral->customer_email,
                    ];
                });

            // Get period-specific earnings
            $recentEarnings = $affiliate->earnings()
                ->where('created_at', '>=', $dateFrom)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($earning) {
                    return [
                        'id' => $earning->id,
                        'order_invoice' => $earning->order_invoice ?? 'N/A',
                        'order_amount' => (float) $earning->order_amount,
                        'commission_amount' => (float) $earning->commission_amount,
                        'status' => $earning->status,
                        'created_at' => $earning->created_at->toDateTimeString(),
                        'customer_id' => $earning->customer_id,
                        'customer_name' => $earning->customer_name,
                        'customer_email' => $earning->customer_email,
                    ];
                });

            // Get period-specific payouts
            $recentPayouts = $affiliate->payouts()
                ->where('created_at', '>=', $dateFrom)
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get()
                ->map(function ($payout) {
                    return [
                        'id' => $payout->id,
                        'amount' => (float) $payout->amount,
                        'payment_method' => $payout->payment_method,
                        'payment_details' => $payout->payment_details,
                        'status' => $payout->status,
                        'created_at' => $payout->created_at->toDateTimeString(),
                        'updated_at' => $payout->updated_at->toDateTimeString(),
                        'admin_notes' => $payout->admin_notes,
                        'rejection_reason' => $payout->rejection_reason,
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
                        'is_active' => $commission->is_active,
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
                        'is_active' => $commission->is_active,
                    ];
                });

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
                ->where('status', 'confirmed')
                ->sum('commission_amount');

            $periodConversionRate = $periodClicks > 0 ? round(($periodConversions / $periodClicks) * 100, 2) : 0;

            // Get last conversion date
            $lastConversionDate = $affiliate->referrals()
                ->where('status', 'converted')
                ->orderBy('converted_at', 'desc')
                ->pluck('converted_at')
                ->first();

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
                        'created_at' => $affiliate->created_at->toDateTimeString(),
                        'last_conversion_at' => $lastConversionDate?->toDateTimeString(),
                    ],
                    'period_stats' => [
                        'period' => $period,
                        'clicks' => $periodClicks,
                        'conversions' => $periodConversions,
                        'earnings' => (float) $periodEarnings,
                        'conversion_rate' => $periodConversionRate,
                    ],
                    'recent_referrals' => $recentReferrals,
                    'recent_earnings' => $recentEarnings,
                    'recent_payouts' => $recentPayouts,
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

            // Get token from Authorization header and authenticate manually
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authorization token required',
                ], 401);
            }

            // Find and validate the token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token',
                ], 401);
            }

            // Get the user from the token
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            $userId = $user->id;
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
     * Get products with prices and commission information.
     * GET /api/v2/store/affiliate/products
     */
    public function products(Request $request): JsonResponse
    {
        try {
            // Get token from Authorization header and authenticate manually
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authorization token required',
                ], 401);
            }

            // Find and validate the token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token',
                ], 401);
            }

            // Get the user from the token
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            $userId = $user->id;
            $affiliate = Affiliate::where('user_id', $userId)->first();

            if (!$affiliate || !$affiliate->is_approved) {
                return response()->json([
                    'success' => false,
                    'message' => 'You must be an approved affiliate to view products',
                ], 403);
            }

            // Get all active products with their prices
            $products = \App\Modules\Catalog\Models\Product::with(['category', 'variants'])
                ->where('status', 'published')
                ->where('hide', 0)
                ->where('hide_from_website', 0)
                ->get()
                ->map(function ($product) use ($affiliate) {
                    // Check if there's a specific commission rate for this product
                    $productCommission = $affiliate->productCommissions()
                        ->where('product_id', $product->id)
                        ->where('is_active', true)
                        ->first();

                    // Check if there's a category commission
                    $categoryCommission = null;
                    if ($product->category) {
                        $categoryCommission = $affiliate->categoryCommissions()
                            ->where('category_id', $product->category->id)
                            ->where('is_active', true)
                            ->first();
                    }

                    // Determine the commission rate to use
                    $commissionRate = $productCommission
                        ? $productCommission->commission_rate
                        : ($categoryCommission
                            ? $categoryCommission->commission_rate
                            : $affiliate->commission_rate);

                    // Get product price from variants (use minimum price)
                    $price = $product->min_price ?? 0;

                    // Calculate commission amount
                    $commissionAmount = ($price * $commissionRate) / 100;

                    return [
                        'id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'price' => $price,
                        'category' => $product->category?->name ?? 'N/A',
                        'image' => $product->thumbnailUrl, // Uses the accessor from Product model
                        'commission_rate' => (float) $commissionRate,
                        'commission_amount' => $commissionAmount,
                        'commission_type' => $productCommission ? 'product' : ($categoryCommission ? 'category' : 'default'),
                    ];
                });

            return response()->json([
                'success' => true,
                'data' => [
                    'products' => $products,
                    'default_commission_rate' => (float) $affiliate->commission_rate,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch affiliate products', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to load products',
            ], 500);
        }
    }

    /**
     * Update affiliate referral code.
     * POST /api/v2/store/affiliate/update-referral-code
     */
    public function updateReferralCode(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'referral_code' => 'required|string|max:20|unique:affiliates,referral_code',
            ]);

            // Get token from Authorization header and authenticate manually
            $token = $request->bearerToken();

            if (!$token) {
                return response()->json([
                    'success' => false,
                    'message' => 'Authorization token required',
                ], 401);
            }

            // Find and validate the token
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($token);

            if (!$accessToken) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid token',
                ], 401);
            }

            // Get the user from the token
            $user = $accessToken->tokenable;

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated',
                ], 401);
            }

            $userId = $user->id;
            $affiliate = Affiliate::where('user_id', $userId)->first();

            if (!$affiliate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Affiliate account not found',
                ], 404);
            }

            // Update referral code (ensure uppercase)
            $affiliate->referral_code = strtoupper($validated['referral_code']);
            $affiliate->save();

            Log::info('Affiliate referral code updated', [
                'affiliate_id' => $affiliate->id,
                'user_id' => $userId,
                'new_referral_code' => $affiliate->referral_code,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Referral code updated successfully',
                'data' => [
                    'referral_code' => $affiliate->referral_code,
                    'referral_link' => url('/?ref=' . $affiliate->referral_code),
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to update referral code', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update referral code',
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

    /**
     * Track affiliate referral visit (public endpoint, no auth required).
     * POST /api/v2/store/affiliate/track
     *
     * Records when someone visits the site with ?ref=CODE parameter
     */
    public function track(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'referral_code' => 'required|string|max:50',
                'landing_page' => 'nullable|string|max:500',
                'user_agent' => 'nullable|string|max:500',
            ]);

            // Find the affiliate by referral code
            $affiliate = Affiliate::where('referral_code', $validated['referral_code'])
                ->where('is_approved', true)
                ->first();

            if (!$affiliate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or inactive referral code',
                ], 404);
            }

            // Get client IP
            $ipAddress = $request->ip();
            $userAgent = $request->userAgent() ?: $validated['user_agent'] ?? null;
            $landingPage = $validated['landing_page'] ?? $request->input('landing_page') ?? $request->header('referer') ?? '/';

            // Check if there's already a referral from this IP in the last 24 hours (prevent spam)
            $existingReferral = \App\Modules\Affiliate\Models\AffiliateReferral::where('ip_address', $ipAddress)
                ->where('affiliate_id', $affiliate->id)
                ->where('created_at', '>', now()->subHours(24))
                ->first();

            if ($existingReferral) {
                // Update existing referral instead of creating duplicate
                return response()->json([
                    'success' => true,
                    'message' => 'Already tracked recently',
                    'data' => [
                        'referral_id' => $existingReferral->id,
                        'affiliate_id' => $affiliate->id,
                        'tracked_at' => $existingReferral->created_at->toDateTimeString(),
                    ],
                ]);
            }

            // Create new referral record
            $referral = \App\Modules\Affiliate\Models\AffiliateReferral::create([
                'affiliate_id' => $affiliate->id,
                'referral_code' => $validated['referral_code'],
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
                'landing_page' => $landingPage,
                'clicked_at' => now(),
                'status' => 'clicked',
            ]);

            // Increment affiliate's total clicks
            $affiliate->increment('total_clicks');

            Log::info('Affiliate referral tracked', [
                'referral_id' => $referral->id,
                'affiliate_id' => $affiliate->id,
                'referral_code' => $validated['referral_code'],
                'ip_address' => $ipAddress,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Referral tracked successfully',
                'data' => [
                    'referral_id' => $referral->id,
                    'affiliate_id' => $affiliate->id,
                    'tracked_at' => $referral->clicked_at->toDateTimeString(),
                ],
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], 422);

        } catch (\Exception $e) {
            Log::error('Failed to track affiliate referral', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to track referral',
            ], 500);
        }
    }

    /**
     * Verify referral code (public endpoint, no auth required).
     * GET /api/v2/store/affiliate/verify-code
     *
     * Checks if a referral code is valid and active
     */
    public function verifyCode(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'code' => 'required|string|max:50',
            ]);

            $affiliate = Affiliate::where('referral_code', strtoupper($validated['code']))
                ->where('is_approved', true)
                ->first();

            if (!$affiliate) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid or inactive referral code',
                    'data' => null,
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Valid referral code',
                'data' => [
                    'affiliate_id' => $affiliate->id,
                    'referral_code' => $affiliate->referral_code,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to verify referral code', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to verify code',
            ], 500);
        }
    }
}
