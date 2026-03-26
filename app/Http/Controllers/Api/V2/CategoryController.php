<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    use ApiResponse;

    /**
     * 1. List Categories (Flat List)
     */
    public function index(Request $request)
    {
        $query = Category::with('parent')
            ->withCount('products');

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

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'parent_id' => 'nullable|exists:categories,id',
            'image_id' => 'nullable|exists:media_files,id'
        ]);

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
            'is_active' => true
        ]);

        return $this->sendSuccess($category, 'Category created successfully', 201);
    }

    public function show($id)
    {
        return $this->sendSuccess(Category::with('children', 'parent')->findOrFail($id));
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);
        
        $category->update([
            'name' => $request->name,
            'parent_id' => $request->parent_id, // Can move to another parent
            'image_id' => $request->image_id,
            'is_active' => $request->boolean('is_active', $category->is_active)
        ]);

        return $this->sendSuccess($category, 'Category updated successfully');
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);
        
        // Check dependencies (Optional safety)
        if ($category->products()->exists()) {
            return $this->sendError('Cannot delete category containing products.');
        }

        $category->delete();
        return $this->sendSuccess(null, 'Category deleted successfully');
    }
}