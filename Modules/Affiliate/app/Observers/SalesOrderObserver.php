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
        Log::info('🎯 [OBSERVER] SalesOrderObserver.created() triggered', [
            'order_id' => $order->id,
            'invoice_no' => $order->invoice_no,
            'affiliate_referral_code' => $order->affiliate_referral_code,
            'affiliate_referral_id' => $order->affiliate_referral_id,
        ]);

        // CRITICAL: Use afterCommit() to delay until after items are inserted
        // The observer fires during create(), but items are inserted AFTER
        \DB::afterCommit(function () use ($order) {
            $this->processAffiliateCommission($order);
        });
    }

    private function processAffiliateCommission($order): void
    {
        try {
            // Check if order has affiliate referral information
            if (empty($order->affiliate_referral_code) && empty($order->affiliate_referral_id)) {
                Log::info('🚫 [OBSERVER] No affiliate data in order, skipping', ['order_id' => $order->id]);
                return;
            }

            Log::info('✅ [OBSERVER] Order has affiliate data, processing...', ['order_id' => $order->id]);

            $referralCode = $order->affiliate_referral_code ?? null;
            $referralId = $order->affiliate_referral_id ?? null;

            Log::info('📝 [OBSERVER] Extracted values', [
                'referral_code' => $referralCode,
                'referral_id' => $referralId,
            ]);

            if ($referralId) {
                Log::info('🔍 [OBSERVER] Looking up by referral_id: ' . $referralId, []);

                $referral = \App\Modules\Affiliate\Models\AffiliateReferral::find($referralId);
                if ($referral) {
                    Log::info('✅ [OBSERVER] Referral found', ['referral_id' => $referralId]);

                    $affiliate = Affiliate::find($referral->affiliate_id);
                    if ($affiliate && $affiliate->is_approved) {
                        Log::info('✅ [OBSERVER] Affiliate found and approved, calling calculateOrderCommission', [
                            'affiliate_id' => $affiliate->id,
                            'referral_code' => $referralCode,
                        ]);
                        $affiliate->calculateOrderCommission($order, $referralCode);
                    } else {
                        Log::warning('⚠️ [OBSERVER] Affiliate not found or not approved', [
                            'referral_id' => $referralId,
                        ]);
                    }
                } else {
                    Log::warning('⚠️ [OBSERVER] Referral not found', ['referral_id' => $referralId]);
                }
            } elseif ($referralCode) {
                Log::info('🔍 [OBSERVER] Looking up affiliate by referral_code: ' . $referralCode, []);

                $affiliate = Affiliate::where('referral_code', $referralCode)
                    ->where('is_approved', true)
                    ->first();

                if ($affiliate) {
                    Log::info('✅ [OBSERVER] Affiliate found and approved, calling calculateOrderCommission', [
                        'affiliate_id' => $affiliate->id,
                        'referral_code' => $referralCode,
                    ]);

                    $result = $affiliate->calculateOrderCommission($order, $referralCode);

                    Log::info('✅ [OBSERVER] calculateOrderCommission returned: ' . ($result ? 'true' : 'false'), [
                        'order_id' => $order->id,
                        'affiliate_id' => $affiliate->id,
                    ]);
                } else {
                    Log::warning('⚠️ [OBSERVER] Affiliate not found or not approved', [
                        'referral_code' => $referralCode,
                    ]);
                }
            }

        } catch (\Exception $e) {
            Log::error('❌ [OBSERVER] Failed to process affiliate commission', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
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
