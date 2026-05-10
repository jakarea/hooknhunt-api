<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Banner;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class BannerController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $query = Banner::orderBy('sort_order', 'asc');

        if ($request->position) {
            $query->where('position', $request->position); // home_slider, sidebar, popup
        }

        return $this->sendSuccess($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'image_url' => 'required|url',
            'position' => 'required|in:home_slider,sidebar,footer,popup',
            'sort_order' => 'integer'
        ]);

        $banner = Banner::create($request->all());
        return $this->sendSuccess($banner, 'Banner created');
    }

    public function update(Request $request, $id)
    {
        $banner = Banner::findOrFail($id);
        $banner->update($request->all());
        return $this->sendSuccess($banner, 'Banner updated');
    }

    public function reorder(Request $request)
    {
        $request->validate(['banners' => 'required|array']); // [{id: 1, sort_order: 1}, ...]

        foreach ($request->banners as $item) {
            Banner::where('id', $item['id'])->update(['sort_order' => $item['sort_order']]);
        }

        return $this->sendSuccess(null, 'Banners reordered');
    }

    public function destroy($id)
    {
        Banner::findOrFail($id)->delete();
        return $this->sendSuccess(null, 'Banner deleted');
    }
}