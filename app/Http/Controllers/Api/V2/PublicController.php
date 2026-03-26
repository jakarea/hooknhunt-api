<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Setting; // Ensure this model exists (Batch 1)
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PublicController extends Controller
{
    use ApiResponse;

    /**
     * 1. Public Product List
     * Only shows 'published' products
     */
    public function productList(Request $request)
    {
        $query = Product::with(['category', 'brand', 'thumbnail', 'variants'])
            ->where('status', 'published'); // Strict Filter

        // Filter by Category
        if ($request->category_slug) {
            $query->whereHas('category', function($q) use ($request) {
                $q->where('slug', $request->category_slug);
            });
        }

        // Filter by Search
        if ($request->search) {
            $query->where('name', 'like', "%{$request->search}%");
        }

        // Sorting
        if ($request->sort === 'price_low') {
            // Complex sort (skipped for MVP, default latest)
            $query->latest(); 
        } else {
            $query->latest();
        }

        return $this->sendSuccess($query->paginate(20));
    }

    /**
     * 2. Single Product Detail
     * Fetches by Slug
     */
    public function productDetail($slug)
    {
        $product = Product::with(['category', 'brand', 'thumbnail', 'variants.channelSettings'])
            ->where('status', 'published')
            ->where('slug', $slug)
            ->first();

            if ($product && $product->gallery_images) {
                $product->gallery_urls = \App\Models\MediaFile::whereIn('id', $product->gallery_images)->get();
            }

        if (!$product) {
            return $this->sendError('Product not found', null, 404);
        }

        return $this->sendSuccess($product);
    }

    /**
     * 3. Category Tree (For Menu)
     */
    public function categories()
    {
        $categories = Category::with('children')
            ->whereNull('parent_id')
            ->where('is_active', true)
            ->get();
            
        return $this->sendSuccess($categories);
    }

    /**
     * 4. General Settings (Logo, Site Name)
     */
    public function generalSettings()
    {
        // Settings টেবিল থেকে পাবলিক ডাটাগুলো আনি
        $settings = Setting::whereIn('key', ['site_name', 'site_logo', 'currency_symbol', 'contact_phone'])->pluck('value', 'key');
        
        return $this->sendSuccess($settings);
    }
    
    // Placeholder methods for Menu/Pages (Batch 10)
    public function menu($slug) { return $this->sendSuccess([]); }
    public function page($slug) { return $this->sendSuccess([]); }
}