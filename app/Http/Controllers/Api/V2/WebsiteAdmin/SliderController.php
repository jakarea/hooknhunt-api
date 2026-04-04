<?php

namespace App\Http\Controllers\Api\V2\WebsiteAdmin;

use App\Http\Controllers\Controller;
use App\Models\Website\Slider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SliderController extends Controller
{
    public function index(): JsonResponse
    {
        $sliders = Slider::orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'data' => $sliders,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'media_type' => 'required|in:image,video',
            'image_url' => 'nullable|string|required_if:media_type,image',
            'video_url' => 'nullable|string|required_if:media_type,video',
            'capsule_title' => 'nullable|string|max:100',
            'title' => 'required|string|max:255',
            'sub_title' => 'nullable|string|max:255',
            'features' => 'nullable|string',
            'cta1_label' => 'nullable|string|max:50',
            'cta1_link' => 'nullable|string|max:255',
            'cta2_label' => 'nullable|string|max:50',
            'cta2_link' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $maxSort = Slider::max('sort_order') ?? 0;
        $validated['sort_order'] = $maxSort + 1;

        $slider = Slider::create($validated);

        return response()->json([
            'success' => true,
            'data' => $slider,
        ], 201);
    }

    public function show(Slider $slider): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $slider,
        ]);
    }

    public function update(Request $request, Slider $slider): JsonResponse
    {
        $validated = $request->validate([
            'media_type' => 'sometimes|in:image,video',
            'image_url' => 'nullable|string',
            'video_url' => 'nullable|string',
            'capsule_title' => 'nullable|string|max:100',
            'title' => 'sometimes|string|max:255',
            'sub_title' => 'nullable|string|max:255',
            'features' => 'nullable|string',
            'cta1_label' => 'nullable|string|max:50',
            'cta1_link' => 'nullable|string|max:255',
            'cta2_label' => 'nullable|string|max:50',
            'cta2_link' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        $slider->update($validated);

        return response()->json([
            'success' => true,
            'data' => $slider->fresh(),
        ]);
    }

    public function destroy(Slider $slider): JsonResponse
    {
        $slider->delete();

        return response()->json([
            'success' => true,
            'message' => 'Slider deleted successfully',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:sliders,id',
            'items.*.sort_order' => 'required|integer',
        ]);

        foreach ($validated['items'] as $item) {
            Slider::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Order updated successfully',
        ]);
    }
}
