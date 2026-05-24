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