<?php

namespace App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin;


use App\Http\Controllers\Controller;
use App\Modules\Website\Models\WebsiteSlider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SliderController extends Controller
{
    /**
     * Get all sliders
     * Module independence: Direct database query, no external relationships
     */
    public function index(): JsonResponse
    {
        $sliders = WebsiteSlider::orderBy('sort_order')->get();

        return response()->json([
            'success' => true,
            'data' => $sliders,
        ]);
    }

    /**
     * Store a new slider
     * Module independence: Pure function with direct database access
     */
    public function store(Request $request): JsonResponse
    {
        try {
            DB::beginTransaction();

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

            // Auto-assign sort_order (module independence: direct DB query)
            $maxSort = DB::table('sliders')->max('sort_order') ?? 0;
            $validated['sort_order'] = $maxSort + 1;

            $slider = WebsiteSlider::create($validated);

            DB::commit();

            Log::info('Slider created', ['slider_id' => $slider->id]);

            return response()->json([
                'success' => true,
                'data' => $slider,
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to create slider', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to create slider.',
            ], 500);
        }
    }

    /**
     * Get a specific slider
     * Module independence: Direct query without relationships
     */
    public function show($id): JsonResponse
    {
        // Module independence: Direct DB query instead of route model binding
        $slider = DB::table('sliders')->where('id', $id)->first();

        if (!$slider) {
            return response()->json([
                'success' => false,
                'message' => 'Slider not found.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $slider,
        ]);
    }

    /**
     * Update a slider
     * Module independence: Direct database operations
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Module independence: Check if slider exists via direct query
            $slider = DB::table('sliders')->where('id', $id)->first();

            if (!$slider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slider not found.',
                ], 404);
            }

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

            // Module independence: Direct DB update instead of model update
            DB::table('sliders')->where('id', $id)->update($validated);

            DB::commit();

            Log::info('Slider updated', ['slider_id' => $id]);

            // Return updated slider
            $updatedSlider = DB::table('sliders')->where('id', $id)->first();

            return response()->json([
                'success' => true,
                'data' => $updatedSlider,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to update slider', ['slider_id' => $id, 'error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update slider.',
            ], 500);
        }
    }

    /**
     * Delete a slider
     * Module independence: Direct database delete
     */
    public function destroy($id): JsonResponse
    {
        try {
            DB::beginTransaction();

            // Module independence: Check existence and delete via direct query
            $exists = DB::table('sliders')->where('id', $id)->exists();

            if (!$exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slider not found.',
                ], 404);
            }

            DB::table('sliders')->where('id', $id)->delete();

            DB::commit();

            Log::info('Slider deleted', ['slider_id' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Slider deleted successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to delete slider', ['slider_id' => $id, 'error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to delete slider.',
            ], 500);
        }
    }

    /**
     * Reorder sliders
     * Module independence: Bulk direct database update
     */
    public function reorder(Request $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validate([
                'items' => 'required|array',
                'items.*.id' => 'required|integer|exists:sliders,id',
                'items.*.sort_order' => 'required|integer',
            ]);

            // Module independence: Bulk direct database update
            foreach ($validated['items'] as $item) {
                DB::table('sliders')->where('id', $item['id'])->update([
                    'sort_order' => $item['sort_order']
                ]);
            }

            DB::commit();

            Log::info('Sliders reordered', ['count' => count($validated['items'])]);

            return response()->json([
                'success' => true,
                'message' => 'Order updated successfully',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Failed to reorder sliders', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update order.',
            ], 500);
        }
    }

    /**
     * Toggle slider active status
     * Module independence: Direct database update
     */
    public function toggleStatus($id): JsonResponse
    {
        try {
            // Module independence: Get current status via direct query
            $slider = DB::table('sliders')->where('id', $id)->first(['id', 'is_active']);

            if (!$slider) {
                return response()->json([
                    'success' => false,
                    'message' => 'Slider not found.',
                ], 404);
            }

            // Module independence: Direct database toggle
            $newStatus = !$slider->is_active;
            DB::table('sliders')->where('id', $id)->update(['is_active' => $newStatus]);

            Log::info('Slider status toggled', ['slider_id' => $id, 'new_status' => $newStatus]);

            return response()->json([
                'success' => true,
                'message' => 'Slider status updated successfully.',
                'data' => ['is_active' => $newStatus],
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to toggle slider status', ['slider_id' => $id, 'error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to update slider status.',
            ], 500);
        }
    }
}
