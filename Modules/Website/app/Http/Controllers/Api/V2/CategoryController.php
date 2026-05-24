<?php

namespace App\Modules\Website\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Website\Models\WebsiteCategory;
use App\Traits\ApiResponse;
use App\Traits\ImageHelper;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class CategoryController extends Controller
{
    use ApiResponse, ImageHelper;

    /**
     * Get featured categories (Website module - self-contained).
     */
    public function featured(): JsonResponse
    {
        try {
            $categories = WebsiteCategory::active()
                ->featured()
                ->with(['parent', 'children'])
                ->orderBy('position')
                ->get();

            // Transform categories to include full image URLs
            $transformed = $categories->map(function ($category) {
                $imageData = $this->formatCategoryImage(
                    $category->image_id ?? null,
                    null,
                    $category->image_path ?? null
                );

                $categoryArray = $category->toArray();
                $categoryArray['image_url'] = $imageData['image_url'];
                $categoryArray['image_id'] = $imageData['image_id'];
                return $categoryArray;
            });

            return $this->sendSuccess($transformed, 'Featured categories retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Website: Error retrieving featured categories', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve featured categories.', null, 500);
        }
    }

    /**
     * Get category by slug (Website module - self-contained).
     */
    public function show(string $slug): JsonResponse
    {
        try {
            $category = WebsiteCategory::where('slug', $slug)
                ->with(['parent', 'children'])
                ->firstOrFail();

            // Transform category to include full image URL
            $imageData = $this->formatCategoryImage(
                $category->image_id ?? null,
                null,
                $category->image_path ?? null
            );

            $categoryArray = $category->toArray();
            $categoryArray['image_url'] = $imageData['image_url'];
            $categoryArray['image_id'] = $imageData['image_id'];

            return $this->sendSuccess($categoryArray, 'Category retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Website: Error retrieving category', ['slug' => $slug, 'error' => $e->getMessage()]);
            return $this->sendError('Category not found.', null, 404);
        }
    }
}
