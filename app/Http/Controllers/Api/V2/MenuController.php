<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    use ApiResponse;

    public function index()
    {
        return $this->sendSuccess(Menu::all());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string', // e.g., "Main Header"
            'slug' => 'required|unique:menus,slug',
            'items' => 'required|array' // JSON structure: [{label: "Home", url: "/"}, ...]
        ]);

        $menu = Menu::create($request->all());
        return $this->sendSuccess($menu, 'Menu created');
    }

    public function update(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);
        
        $menu->update($request->only(['name', 'items']));
        
        return $this->sendSuccess($menu, 'Menu updated');
    }

    public function destroy($id)
    {
        Menu::findOrFail($id)->delete();
        return $this->sendSuccess(null, 'Menu deleted');
    }
}