<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\JsonResponse;

class WebsiteController extends Controller
{
    /**
     * Get website tracking codes for frontend.
     * Public endpoint - no authentication required.
     * GET /api/v2/website/tracking
     */
    public function tracking(): JsonResponse
    {
        $settings = Setting::where('group', 'website')
            ->pluck('value', 'key')
            ->toArray();

        return response()->json([
            'success' => true,
            'data' => [
                'facebook' => [
                    'pixel_id' => $settings['facebook_pixel_id'] ?? null,
                    'pixel_code' => $settings['facebook_pixel_code'] ?? null,
                ],
                'google' => [
                    'analytics_id' => $settings['google_analytics_id'] ?? null,
                    'analytics_code' => $settings['google_analytics_code'] ?? null,
                    'tag_manager_id' => $settings['google_tag_manager_id'] ?? null,
                    'tag_manager_code' => $settings['google_tag_manager_code'] ?? null,
                ],
            ],
        ]);
    }
}
