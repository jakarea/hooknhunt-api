<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin;


use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    /**
     * Convert string "true"/"false"/"1"/"0" to boolean
     */
    private function convertToBoolean($value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_string($value)) {
            $lower = strtolower($value);
            if ($lower === 'true' || $lower === '1' || $lower === 'yes') {
                return true;
            }
            if ($lower === 'false' || $lower === '0' || $lower === 'no') {
                return false;
            }
        }

        if (is_numeric($value)) {
            return (bool) $value;
        }

        return null;
    }

    /**
     * Get all website settings.
     * GET /api/v2/website-admin/settings
     */
    public function index(): JsonResponse
    {
        // Pure function - direct database access, no cross-module dependencies
        $settings = DB::table('settings')->where('key', 'like', 'website_%')->pluck('value', 'key');

        return response()->json([
            'success' => true,
            'data' => [
                'facebookPixelId' => $settings['website_facebook_pixel_id'] ?? null,
                'facebookPixelCode' => $settings['website_facebook_pixel_code'] ?? null,
                'googleAnalyticsId' => $settings['website_google_analytics_id'] ?? null,
                'googleAnalyticsCode' => $settings['website_google_analytics_code'] ?? null,
                'googleTagManagerId' => $settings['website_google_tag_manager_id'] ?? null,
                'googleTagManagerCode' => $settings['website_google_tag_manager_code'] ?? null,
                'serviceChargeEnabled' => filter_var($settings['website_service_charge_enabled'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
                'serviceChargeAmount' => (float) ($settings['website_service_charge_amount'] ?? 0),
            ],
        ]);
    }

    /**
     * Update website settings.
     * PUT /api/v2/website-admin/settings
     */
    public function update(Request $request): JsonResponse
    {
        // Convert string "true"/"false" to actual booleans before validation
        $request->merge([
            'serviceChargeEnabled' => $this->convertToBoolean($request->input('serviceChargeEnabled')),
            'service_charge_enabled' => $this->convertToBoolean($request->input('service_charge_enabled')),
        ]);

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

        // Only process allowed website settings fields
        $allowedFields = [
            'facebook_pixel_id', 'facebook_pixel_code',
            'google_analytics_id', 'google_analytics_code',
            'google_tag_manager_id', 'google_tag_manager_code',
            'service_charge_enabled', 'service_charge_amount',
        ];

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

            // Only process allowed fields
            if (!in_array($snakeKey, $allowedFields)) {
                continue;
            }

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

        // Pure function - direct database access, no cross-module dependencies
        foreach ($storageData as $key => $value) {
            DB::table('settings')
                ->updateOrInsert(
                    ['key' => 'website_' . $key],
                    [
                        'value' => $value,
                        'group' => 'website',
                        'updated_at' => now()
                    ]
                );
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'data' => $validated,
        ]);
    }
}
