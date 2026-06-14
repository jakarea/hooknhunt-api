<?php

namespace App\Modules\Affiliate\Observers;

use App\Modules\Affiliate\Models\Affiliate;
use App\Modules\Affiliate\Models\AffiliateReferral;
use Illuminate\Support\Facades\Log;

class SalesOrderObserver
{
    /**
     * Handle the SalesOrder "created" event.
     * Calculate affiliate commission when order is created.
     */
    public function created($order): void
    {
        try {
            // Check if order has affiliate referral information
            if (empty($order->affiliate_referral_code) && empty($order->affiliate_referral_id)) {
                return;
            }

            $referralCode = $order->affiliate_referral_code ?? null;
            $referralId = $order->affiliate_referral_id ?? null;

            if ($referralId) {
                // Find referral by ID
                $referral = \App\Modules\Affiliate\Models\AffiliateReferral::find($referralId);
                if ($referral) {
                    $affiliate = Affiliate::find($referral->affiliate_id);
                    if ($affiliate && $affiliate->is_approved) {
                        $affiliate->calculateOrderCommission($order, $referralCode);
                    }
                }
            } elseif ($referralCode) {
                // Find affiliate by referral code
                $affiliate = Affiliate::where('referral_code', $referralCode)
                    ->where('is_approved', true)
                    ->first();

                if ($affiliate) {
                    $affiliate->calculateOrderCommission($order, $referralCode);
                }
            }

        } catch (\Exception $e) {
            Log::error('Failed to process affiliate commission on order creation', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Handle the SalesOrder "updated" event.
     * Update commission when order status changes to completed.
     */
    public function updated($order): void
    {
        // You could add logic here to update commission status
        // when order status changes (e.g., from pending to completed)
    }
}
