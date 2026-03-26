<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Warehouse;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index()
    {
        return Warehouse::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required',
            'type' => 'required|in:china,transit,local_hub,showroom',
            'location' => 'nullable'
        ]);

        return Warehouse::create($validated);
    }

    public function stockSummary($id)
    {
        $warehouse = Warehouse::withCount(['batches as total_batches' => function($query){
            $query->where('remaining_qty', '>', 0);
        }])->findOrFail($id);

        return response()->json([
            'warehouse' => $warehouse->name,
            'active_batches' => $warehouse->total_batches
        ]);
    }
}