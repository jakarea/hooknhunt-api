<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Traits\ApiResponse;

class PricingController extends Controller
{
    use ApiResponse;

    /**
     * 1. Get All Channel Prices for a Variant
     */
    public function getChannelPrices($variantId)
    {
        // সরাসরি DB টেবিল থেকে ডাটা আনছি কারণ এটি Pivot/Setting টেবিল
        $prices = DB::table('product_channel_settings')
                    ->where('product_variant_id', $variantId)
                    ->get();

        return $this->sendSuccess($prices);
    }

    /**
     * 2. Set Price for Specific Channel
     * Payload: { "channel": "daraz", "price": 1550 }
     */
    public function setChannelPrice(Request $request, $variantId)
    {
        $request->validate([
            'channel' => 'required|string|in:website,pos,daraz,wholesale,reseller',
            'price' => 'required|numeric|min:0'
        ]);

        // Check if variant exists
        $variant = ProductVariant::findOrFail($variantId);

        // Update or Insert logic
        DB::table('product_channel_settings')->updateOrInsert(
            [
                'product_variant_id' => $variantId,
                'channel_slug' => $request->channel
            ],
            [
                'price' => $request->price,
                'updated_at' => now()
            ]
        );

        return $this->sendSuccess(null, "Price for {$request->channel} updated to {$request->price}");
    }
}