<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\LandingPage;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LandingPageController extends Controller
{
    use ApiResponse;

    /**
     * 1. List Pages
     */
    public function index()
    {
        return $this->sendSuccess(LandingPage::select('id', 'title', 'slug', 'is_active', 'updated_at')->get());
    }

    /**
     * 2. Create New Page
     */
    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'slug' => 'nullable|unique:landing_pages,slug'
        ]);

        $page = LandingPage::create([
            'title' => $request->title,
            'slug' => $request->slug ? Str::slug($request->slug) : Str::slug($request->title),
            'content_sections' => [], // Start empty
            'is_active' => false
        ]);

        return $this->sendSuccess($page, 'Page created. Now add sections.');
    }

    /**
     * 3. Update Page Sections (The "Save" button of Page Builder)
     */
    public function updateSections(Request $request, $id)
    {
        $request->validate([
            'sections' => 'required|array' // JSON Array of components (Hero, ProductGrid, etc.)
        ]);

        $page = LandingPage::findOrFail($id);
        
        $page->update([
            'content_sections' => $request->sections,
            'is_active' => $request->is_active ?? $page->is_active,
            'meta_title' => $request->meta_title,
            'meta_description' => $request->meta_description
        ]);

        return $this->sendSuccess($page, 'Page updated successfully.');
    }

    /**
     * 4. Show Page (Admin View)
     */
    public function show($id)
    {
        return $this->sendSuccess(LandingPage::findOrFail($id));
    }

    /**
     * 5. Delete Page
     */
    public function destroy($id)
    {
        LandingPage::findOrFail($id)->delete();
        return $this->sendSuccess(null, 'Page deleted');
    }
}