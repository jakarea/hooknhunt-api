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
        ]);

        Setting::updateWebsiteSettings($validated);

        return response()->json([
            'success' => true,
            'message' => 'Settings updated successfully',
            'data' => $validated,
        ]);
    }
}
