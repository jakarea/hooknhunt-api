<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\Website;


use App\Http\Controllers\Controller;
use App\Traits\ImageHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StorefrontSliderController extends Controller
{
    use ImageHelper;
    /**
     * Get active sliders for storefront
     * Module independence: Direct database query, no external relationships
     */
    public function index(): JsonResponse
    {
        // Module independence: Direct DB query instead of Eloquent relationships
        $sliders = DB::table('sliders')
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get([
                'id',
                'media_type',
                'image_url',
                'video_url',
                'capsule_title',
                'title',
                'sub_title',
                'features',
                'cta1_label',
                'cta1_link',
                'cta2_label',
                'cta2_link',
                'sort_order'
            ]);

        // Transform features to list and format URLs based on media type
        $sliders->transform(function ($slider) {
            $slider->features_list = [];
            if ($slider->features) {
                $slider->features_list = array_map('trim', explode(',', $slider->features));
            }

            // Handle URLs based on media type
            if ($slider->media_type === 'video') {
                // For videos, keep video_url as-is (YouTube URLs are already full URLs)
                // Set image_url to null or placeholder for videos
                $slider->image_url = null;
            } else {
                // For images, format image_url to full URL with placeholder fallback
                $slider->image_url = $this->formatSliderImage($slider->image_url);
            }

            return $slider;
        });

        return response()->json([
            'success' => true,
            'data' => $sliders,
        ]);
    }
}
