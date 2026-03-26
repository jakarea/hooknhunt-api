<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use App\Models\ProductChannelSetting;
use App\Traits\ApiResponse; // Assuming you have this trait
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductPricingController extends Controller
{
    use ApiResponse;

 /**
     * Update Channel Wise Prices for a Variant
     * POST /api/v2/pricing/update
     */
    public function updatePrices(Request $request)
    {
        $request->validate([
            'variant_id' => 'required|exists:product_variants,id',
            'prices' => 'required|array',
            'prices.*.channel' => 'required|in:retail_web,wholesale_web,daraz,pos',
            'prices.*.price' => 'required|numeric|min:0',
            'prices.*.custom_name' => 'nullable|string' // যেমন: দারাজে নাম ভিন্ন হতে পারে
        ]);

        DB::beginTransaction();
        try {
            $variant = ProductVariant::findOrFail($request->variant_id);

            foreach ($request->prices as $priceData) {
                // Update or Create price for specific channel
                ProductChannelSetting::updateOrCreate(
                    [
                        'product_variant_id' => $variant->id,
                        'channel' => $priceData['channel']
                    ],
                    [
                        'price' => $priceData['price'],
                        'custom_name' => $priceData['custom_name'] ?? null,
                        'is_active' => true
                    ]
                );

                // Optional: যদি retail_web এর দাম সেট করা হয়, তবে মূল ভেরিয়েন্টের ডিফল্ট প্রাইসও আপডেট করে দেওয়া ভালো
                if ($priceData['channel'] === 'retail_web') {
                    $variant->update(['default_retail_price' => $priceData['price']]);
                }
                
                // Optional: যদি wholesale_web এর দাম সেট করা হয়
                if ($priceData['channel'] === 'wholesale_web') {
                    $variant->update(['default_wholesale_price' => $priceData['price']]);
                }
            }

            DB::commit();
            
            // আপডেটেড ডাটা রিটার্ন
            return $this->sendSuccess(
                $variant->load('channelSettings'), 
                'Variation prices updated successfully for all platforms.'
            );

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * 2. Helper to fetch Price for Sales (Internal or External Call)
     */
    public function getSellingPrice($variantId, $channel)
    {
        // ১. প্রথমে দেখব চ্যানেল স্পেসিফিক প্রাইস আছে কিনা
        $specificSetting = ProductChannelSetting::where('product_variant_id', $variantId)
            ->where('channel', $channel)
            ->where('is_active', true)
            ->first();

        if ($specificSetting) {
            return $specificSetting->price;
        }

        // ২. না থাকলে ডিফল্ট প্রাইস রিটার্ন করব (Fallback Logic)
        $variant = ProductVariant::find($variantId);
        
        if ($channel === 'wholesale_web') {
            return $variant->default_wholesale_price;
        }

        // বাকি সব (POS, Daraz, Retail) ডিফল্ট রিটেইল প্রাইস পাবে যদি সেট করা না থাকে
        return $variant->default_retail_price;
    }
}