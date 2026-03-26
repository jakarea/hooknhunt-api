<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class BrandController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Brand::latest();
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }
        return $this->sendSuccess($query->paginate(20));
    }

    public function dropdown()
    {
        return $this->sendSuccess(Brand::select('id', 'name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|unique:brands,name',
            'logo_id' => 'nullable|exists:media_files,id',
            'website' => 'nullable|url'
        ]);

        $brand = Brand::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'logo_id' => $validated['logo_id'] ?? null,
            'website' => $validated['website'] ?? null
        ]);

        return $this->sendSuccess($brand, 'Brand created', 201);
    }

    public function show($id)
    {
        $brand = Brand::findOrFail($id);
        return $this->sendSuccess($brand);
    }

    public function update(Request $request, $id)
    {
        $brand = Brand::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|unique:brands,name,' . $id,
            'logo_id' => 'nullable|exists:media_files,id',
            'website' => 'nullable|url'
        ]);

        // If name is being updated, regenerate slug
        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $brand->update($validated);

        return $this->sendSuccess($brand, 'Brand updated');
    }

    public function destroy($id)
    {
        Brand::destroy($id);
        return $this->sendSuccess(null, 'Brand deleted');
    }
}