<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Affiliate;
use App\Models\SalesOrder;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AffiliateController extends Controller
{
    use ApiResponse;

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
            'referral_code' => $this->generateUniqueCode($user->name),
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

    // --- Helper: Generate Unique Referral Code ---
    private function generateUniqueCode($name)
    {
        $base = Str::slug($name);
        $code = $base . rand(100, 999);
        while (Affiliate::where('referral_code', $code)->exists()) {
            $code = $base . rand(100, 999);
        }
        return strtoupper($code);
    }

    public function awardPoints(SalesOrder $order)
    {
        // 1. Validation: Guest orders or already processed orders don't get points
        if (!$order->customer_id) return;
        
        // Check if points already awarded for this order to prevent duplicates
        $exists = LoyaltyTransaction::where('sales_order_id', $order->id)
                    ->where('type', 'earned')
                    ->exists();
        if ($exists) return;

        // 2. Find Best Matching Rule (Highest minimum amount rule applies)
        $rule = LoyaltyRule::where('is_active', 1)
                ->where('min_order_amount', '<=', $order->total_amount)
                ->orderBy('min_order_amount', 'desc')
                ->first();

        if (!$rule) return; // No rule matched

        // 3. Calculate Points
        // Example: Order 2500 Tk, Rule: 1 Point per 100 Tk. Points = 25
        $points = floor(($order->total_amount / 100) * $rule->points_per_100_taka);

        if ($points > 0) {
            // 4. Record Transaction
            LoyaltyTransaction::create([
                'customer_id'       => $order->customer_id,
                'sales_order_id'    => $order->id,
                'type'              => 'earned',
                'points'            => $points,
                'equivalent_amount' => 0, // Future feature: Cash value of points
                'description'       => "Earned from Order #{$order->invoice_no}"
            ]);

            // Optional: Update a total_points column in customers table for fast read
            // $order->customer->increment('total_points', $points);
            
            Log::info("Loyalty: Awarded {$points} points to Customer {$order->customer_id}");
        }
    }
}