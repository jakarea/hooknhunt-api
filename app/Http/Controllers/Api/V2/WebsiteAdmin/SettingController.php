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
                'facebook_pixel_id' => $settings['facebook_pixel_id'] ?? null,
                'facebook_pixel_code' => $settings['facebook_pixel_code'] ?? null,
                'google_analytics_id' => $settings['google_analytics_id'] ?? null,
                'google_analytics_code' => $settings['google_analytics_code'] ?? null,
                'google_tag_manager_id' => $settings['google_tag_manager_id'] ?? null,
                'google_tag_manager_code' => $settings['google_tag_manager_code'] ?? null,
                'service_charge_enabled' => filter_var($settings['service_charge_enabled'] ?? 'false', FILTER_VALIDATE_BOOLEAN),
                'service_charge_amount' => (float) ($settings['service_charge_amount'] ?? 0),
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
            'facebook_pixel_id' => 'nullable|string|max:255',
            'facebook_pixel_code' => 'nullable|string',
            'google_analytics_id' => 'nullable|string|max:255',
            'google_analytics_code' => 'nullable|string',
            'google_tag_manager_id' => 'nullable|string|max:255',
            'google_tag_manager_code' => 'nullable|string',
            'service_charge_enabled' => 'nullable|boolean',
            'service_charge_amount' => 'nullable|numeric|min:0',
            // Also accept camelCase from frontend
            'serviceChargeEnabled' => 'nullable|boolean',
            'serviceChargeAmount' => 'nullable|numeric|min:0',
        ]);

        // Convert camelCase to snake_case for storage
        if (isset($validated['serviceChargeEnabled'])) {
            $validated['service_charge_enabled'] = $validated['serviceChargeEnabled'] ? 'true' : 'false';
            unset($validated['serviceChargeEnabled']);
        }
        if (isset($validated['serviceChargeAmount'])) {
            $validated['service_charge_amount'] = (string) $validated['serviceChargeAmount'];
            unset($validated['serviceChargeAmount']);
        }

        // Convert boolean to string for storage (if still in snake_case format)
        if (isset($validated['service_charge_enabled']) && is_bool($validated['service_charge_enabled'])) {
            $validated['service_charge_enabled'] = $validated['service_charge_enabled'] ? 'true' : 'false';
        }

        Setting::updateWebsiteSettings($validated);

        // Convert back for response
        $responseData = $validated;
        if (isset($responseData['service_charge_enabled'])) {
            $responseData['service_charge_enabled'] = filter_var($responseData['service_charge_enabled'], FILTER_VALIDATE_BOOLEAN);
        }

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'data' => $responseData,
        ]);
    }
}
