<?php

namespace App\Services;

use App\Models\LoyaltyRule;
use App\Models\LoyaltyTransaction;
use App\Models\Customer;

class LoyaltyService
{
    public function awardPoints($order)
    {
        if (!$order->customer_id) return;

        // ১. অর্ডার চ্যানেল এবং অ্যামাউন্ট অনুযায়ী বেস্ট রুলটি খুঁজে বের করা
        $rule = LoyaltyRule::where('is_active', 1)
                ->where(function($q) use ($order) {
                    $q->where('channel', $order->channel)
                      ->orWhere('channel', 'all');
                })
                ->where('min_order_amount', '<=', $order->total_amount)
                // যেটা সবচেয়ে বেশি বেনিফিট বা স্পেসিফিক সেটা আগে নিব
                ->orderBy('min_order_amount', 'desc') 
                ->first();

        if (!$rule) return;

        // ২. ক্যালকুলেশন: (Total / Spend Amount) * Reward Points
        // Ex: 5000 / 100 * 1 = 50 Points
        // Ex: 5000 / 500 * 1 = 10 Points (Wholesale)
        if ($rule->spend_amount > 0) {
            $points = floor(($order->total_amount / $rule->spend_amount) * $rule->reward_points);
        } else {
            $points = 0;
        }

        if ($points > 0) {
            LoyaltyTransaction::create([
                'customer_id' => $order->customer_id,
                'sales_order_id' => $order->id,
                'type' => 'earned',
                'points' => $points,
                'description' => "Earned from Order #{$order->invoice_no} via {$order->channel}"
            ]);

            // Optional: Increment Customer Total Points column if you have one
            $customer = Customer::find($order->customer_id);
            if ($customer) {
                // Assuming you might add this column later or calculate on fly
                // $customer->increment('total_points', $points);
            }
        }
    }
}