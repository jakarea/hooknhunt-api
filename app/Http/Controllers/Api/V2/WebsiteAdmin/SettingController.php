<?php

namespace App\Http\Controllers\Api\V2\WebsiteAdmin;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Get all website settings.
     * GET /api/v2/website-admin/settings
     */
    public function index(): JsonResponse
    {
        $settings = Setting::getWebsiteSettings();

        return response()->json([
            'success' => true,
            'data' => [
                'facebookPixelId' => $settings['facebook_pixel_id'] ?? null,
                'facebookPixelCode' => $settings['facebook_pixel_code'] ?? null,
                'googleAnalyticsId' => $settings['google_analytics_id'] ?? null,
                'googleAnalyticsCode' => $settings['google_analytics_code'] ?? null,
                'googleTagManagerId' => $settings['google_tag_manager_id'] ?? null,
                'googleTagManagerCode' => $settings['google_tag_manager_code'] ?? null,
                'serviceChargeEnabled' => filter_var($settings['service_charge_enabled'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
                'serviceChargeAmount' => (float) ($settings['service_charge_amount'] ?? 0),
            ],
        ]);
    }

    /**
     * Update website settings.
     * PUT /api/v2/website-admin/settings
     */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            // snake_case (legacy support)
            'facebook_pixel_id' => 'nullable|string|max:255',
            'facebook_pixel_code' => 'nullable|string',
            'google_analytics_id' => 'nullable|string|max:255',
            'google_analytics_code' => 'nullable|string',
            'google_tag_manager_id' => 'nullable|string|max:255',
            'google_tag_manager_code' => 'nullable|string',
            'service_charge_enabled' => 'nullable|boolean',
            'service_charge_amount' => 'nullable|numeric|min:0',
            // camelCase (from frontend)
            'facebookPixelId' => 'nullable|string|max:255',
            'facebookPixelCode' => 'nullable|string',
            'googleAnalyticsId' => 'nullable|string|max:255',
            'googleAnalyticsCode' => 'nullable|string',
            'googleTagManagerId' => 'nullable|string|max:255',
            'googleTagManagerCode' => 'nullable|string',
            'serviceChargeEnabled' => 'nullable|boolean',
            'serviceChargeAmount' => 'nullable|numeric|min:0',
        ]);

        // Convert camelCase to snake_case for storage
        $camelToSnake = [
            'facebookPixelId' => 'facebook_pixel_id',
            'facebookPixelCode' => 'facebook_pixel_code',
            'googleAnalyticsId' => 'google_analytics_id',
            'googleAnalyticsCode' => 'google_analytics_code',
            'googleTagManagerId' => 'google_tag_manager_id',
            'googleTagManagerCode' => 'google_tag_manager_code',
            'serviceChargeEnabled' => 'service_charge_enabled',
            'serviceChargeAmount' => 'service_charge_amount',
        ];

        $storageData = [];
        foreach ($validated as $key => $value) {
            // Convert camelCase to snake_case
            $snakeKey = $camelToSnake[$key] ?? $key;

            // Convert boolean to string for storage
            if ($snakeKey === 'service_charge_enabled' && is_bool($value)) {
                $value = $value ? 'true' : 'false';
            }

            // Convert numeric to string for storage
            if ($snakeKey === 'service_charge_amount' && is_numeric($value)) {
                $value = (string) $value;
            }

            $storageData[$snakeKey] = $value;
        }

        Setting::updateWebsiteSettings($storageData);

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'data' => $validated,
        ]);
    }
}
