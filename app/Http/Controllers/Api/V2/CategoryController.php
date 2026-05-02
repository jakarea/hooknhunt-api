<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * 1. List Categories (Flat List)
     */
    public function index(Request $request)
    {
        $query = Category::with('parent', 'image')
            ->withCount('products')
            ->orderByRaw('category_code IS NULL')
            ->orderBy('category_code', 'asc')
            ->orderBy('name', 'asc');

        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        return $this->sendSuccess($query->paginate(20));
    }

    /**
     * 2. Tree Structure (For Dropdowns/Menus)
     * Returns: Electronics -> Mobile -> Samsung
     */
    public function treeStructure()
    {
        $categories = Category::with('children')->whereNull('parent_id')->get();
        return $this->sendSuccess($categories);
    }

    /**
     * Dropdown List (For UI Select Components)
     * GET /api/v2/catalog/categories/dropdown
     */
    public function dropdown()
    {
        $categories = Category::select('id', 'name')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return $this->sendSuccess($categories);
    }

    /**
     * Get Root Categories (Parent categories only)
     * GET /api/v2/catalog/categories/roots
     */
    public function roots()
    {
        $categories = Category::with('image')
            ->whereNull('parent_id')
            ->withCount('products')
            ->withCount('children')
            ->orderBy('name')
            ->get();

        return $this->sendSuccess($categories);
    }

    /**
     * Get Children by Parent ID
     * GET /api/v2/catalog/categories/{id}/children
     */
    public function children(int $id)
    {
        $categories = Category::with('image', 'parent')
            ->where('parent_id', $id)
            ->withCount('products')
            ->withCount('children')
            ->orderBy('name')
            ->get();

        return $this->sendSuccess($categories);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'category_code' => 'nullable|integer',
            'parent_id' => 'nullable|exists:categories,id',
            'image_id' => 'nullable|exists:media_files,id'
        ]);

        // Validate category code format: must be 3-digit ending with 00 OR 4-digit ending with 000
        if ($request->has('category_code') && $request->category_code) {
            $code = (int) $validated['category_code'];
            $codeStr = (string) $code;

            // Check if valid 3-digit (X00) or 4-digit (X000)
            $isValid3Digit = strlen($codeStr) === 3 && $code % 100 === 0 && $code >= 100;
            $isValid4Digit = strlen($codeStr) === 4 && $code % 1000 === 0 && $code >= 1000;

            if (!$isValid3Digit && !$isValid4Digit) {
                return $this->sendError('Category code must be 3-digit ending with 00 (e.g., 100, 200, 300) or 4-digit ending with 000 (e.g., 1000, 2000, 3000).');
            }

            // Check uniqueness: child categories can share parent code
            $query = DB::table('categories')->where('category_code', $code);
            if ($request->parent_id) {
                // If this is a child category, exclude parent from uniqueness check
                $query->where('id', '!=', $request->parent_id);
            }

            if ($query->exists()) {
                return $this->sendError('This category code is already in use.');
            }
        }

        // Generate unique slug
        $baseSlug = Str::slug($request->name);
        $slug = $baseSlug;
        $counter = 1;

        // Check if slug exists and find the next available number
        while (Category::where('slug', $slug)->exists()) {
            $slug = $baseSlug . '-' . $counter;
            $counter++;
        }

        $category = Category::create([
            'name' => $request->name,
            'slug' => $slug,
            'parent_id' => $request->parent_id,
            'image_id' => $request->image_id,
            'is_active' => true,
            'category_code' => $request->category_code,
        ]);

        return $this->sendSuccess($category, 'Category created successfully', 201);
    }

    public function show(int $id)
    {
        return $this->sendSuccess(Category::with('children', 'parent', 'image')->findOrFail($id));
    }

    /**
     * Get category with full breadcrumb path
     * GET /api/v2/catalog/categories/{id}/path
     */
    public function getPath(int $id)
    {
        $category = Category::findOrFail($id);

        // Build breadcrumb path
        $path = [];
        $current = $category;

        while ($current) {
            array_unshift($path, [
                'id' => $current->id,
                'name' => $current->name,
                'slug' => $current->slug,
            ]);
            $current = $current->parent;
        }

        return $this->sendSuccess([
            'category' => $category,
            'path' => $path,
        ]);
    }

    public function update(Request $request, int $id)
    {
        $category = Category::findOrFail($id);

        // Validate basic fields
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'parent_id' => 'nullable|exists:categories,id',
            'image_id' => 'nullable|exists:media_files,id',
            'is_active' => 'nullable|boolean',
            'category_code' => 'nullable|integer',
        ]);

        // Handle category_code: only allow if currently NULL
        $incomingCode = $validated['category_code'] ?? null;

        // Only validate and update if a new code is being set (not null)
        if ($incomingCode !== null) {
            // Check if category already has a code set
            if ($category->category_code !== null && $category->category_code != $incomingCode) {
                return $this->sendError('Category code cannot be modified once set.');
            }

            // Skip validation if code is not changing
            if ($category->category_code == $incomingCode) {
                // Code unchanged, no validation needed
            } else {
                // New code is being set
                $code = (int) $incomingCode;
                $codeStr = (string) $code;

                // Check if valid 3-digit (X00) or 4-digit (X000)
                $isValid3Digit = strlen($codeStr) === 3 && $code % 100 === 0 && $code >= 100;
                $isValid4Digit = strlen($codeStr) === 4 && $code % 1000 === 0 && $code >= 1000;

                if (!$isValid3Digit && !$isValid4Digit) {
                    return $this->sendError('Category code must be 3-digit ending with 00 (e.g., 100, 200, 300) or 4-digit ending with 000 (e.g., 1000, 2000, 3000).');
                }

                // Check uniqueness: child categories can share parent code
                $query = DB::table('categories')
                    ->where('category_code', $code)
                    ->where('id', '!=', $id);

                if ($request->parent_id) {
                    // If this is a child category, exclude parent from uniqueness check
                    $query->where('id', '!=', $request->parent_id);
                }

                if ($query->exists()) {
                    return $this->sendError('This category code is already in use.');
                }

                $category->category_code = $code;
            }
        }

        $category->update([
            'name' => $validated['name'],
            'parent_id' => $request->parent_id,
            'image_id' => $request->has('image_id') ? ($validated['image_id'] ?? null) : $category->image_id,
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->sendSuccess($category, 'Category updated successfully');
    }

    public function destroy(int $id)
    {
        $category = Category::findOrFail($id);

        // Check dependencies and show product count
        $productCount = $category->products()->count();
        if ($productCount > 0) {
            return $this->sendError("Cannot delete category containing {$productCount} product(s).");
        }

        $category->delete();
        return $this->sendSuccess(null, 'Category deleted successfully');
    }
}