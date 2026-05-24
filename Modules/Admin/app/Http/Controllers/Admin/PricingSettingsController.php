<?php

namespace App\Modules\Admin\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PricingSettingsController extends Controller
{
    /**
     * Get current pricing settings.
     * GET /api/v2/admin/settings/pricing
     */
    public function index(): JsonResponse
    {
        $settings = [
            'wholesaleProfitPercentage' => (int) \App\Models\Setting::getWebsiteSetting('wholesale_profit_percentage', 100),
            'wholesaleOfferPercentage' => (int) \App\Models\Setting::getWebsiteSetting('wholesale_offer_percentage', 25),
            'retailProfitPercentage' => (int) \App\Models\Setting::getWebsiteSetting('retail_profit_percentage', 100),
            'retailOfferPercentage' => (int) \App\Models\Setting::getWebsiteSetting('retail_offer_percentage', 25),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'settings' => $settings,
            ],
        ]);
    }

    /**
     * Update pricing settings.
     * PUT /api/v2/admin/settings/pricing
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings.wholesaleProfitPercentage' => 'required|integer|min:0|max:1000',
            'settings.wholesaleOfferPercentage' => 'required|integer|min:0|max:100',
            'settings.retailProfitPercentage' => 'required|integer|min:0|max:1000',
            'settings.retailOfferPercentage' => 'required|integer|min:0|max:100',
        ]);

        try {
            $settings = $request->input('settings');

            // Store each setting in the database (convert camelCase to snake_case for storage)
            \App\Models\Setting::setWebsiteSetting('wholesale_profit_percentage', $settings['wholesaleProfitPercentage']);
            \App\Models\Setting::setWebsiteSetting('wholesale_offer_percentage', $settings['wholesaleOfferPercentage']);
            \App\Models\Setting::setWebsiteSetting('retail_profit_percentage', $settings['retailProfitPercentage']);
            \App\Models\Setting::setWebsiteSetting('retail_offer_percentage', $settings['retailOfferPercentage']);

            Log::info('Pricing settings updated', [
                'settings' => $settings,
                'updated_by' => auth()->id() ?? 'system',
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Pricing settings updated successfully',
                'data' => [
                    'settings' => $settings,
                ],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to update pricing settings', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update pricing settings',
                'error' => config('app.debug') ? $e->getMessage() : 'Unknown error',
            ], 500);
        }
    }
}
