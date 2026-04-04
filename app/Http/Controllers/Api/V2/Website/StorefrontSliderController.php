<?php

namespace App\Http\Controllers\Api\V2\Website;

use App\Http\Controllers\Controller;
use App\Models\Website\Slider;
use Illuminate\Http\JsonResponse;

class StorefrontSliderController extends Controller
{
    public function index(): JsonResponse
    {
        $sliders = Slider::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn($s) => [
                'image_url' => $s->image_url,
                'video_url' => $s->video_url,
                'capsule_title' => $s->capsule_title,
                'title' => $s->title,
                'sub_title' => $s->sub_title,
                'features' => $s->features,
                'features_list' => $s->features_list,
                'cta1_label' => $s->cta1_label,
                'cta1_link' => $s->cta1_link,
                'cta2_label' => $s->cta2_label,
                'cta2_link' => $s->cta2_link,
                'sort_order' => $s->sort_order,
            ]);

        return response()->json([
            'success' => true,
            'data' => $sliders,
        ]);
    }
}
