<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index()
    {
        return Unit::latest()->get();
    }

    // Lightweight list for Select Box
    public function dropdown()
    {
        return Unit::select('id', 'name', 'symbol', 'allow_decimal')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|unique:units,name',
            'symbol' => 'required',
            'allow_decimal' => 'sometimes|boolean'
        ]);

        // Set default value for allow_decimal if not provided
        if (!isset($validated['allow_decimal'])) {
            $validated['allow_decimal'] = false;
        }

        $unit = Unit::create($validated);
        return response()->json($unit, 201);
    }

    public function update(Request $request, $id)
    {
        $unit = Unit::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|unique:units,name,' . $id,
            'symbol' => 'sometimes|required',
            'allow_decimal' => 'sometimes|boolean'
        ]);

        // Only update fields that were provided
        if (isset($validated['allow_decimal'])) {
            $unit->allow_decimal = $validated['allow_decimal'];
        }

        if ($request->has('name')) {
            $unit->name = $request->input('name');
        }

        if ($request->has('symbol')) {
            $unit->symbol = $request->input('symbol');
        }

        $unit->save();
        return response()->json($unit);
    }

    public function destroy($id)
    {
        Unit::destroy($id);
        return response()->json(['message' => 'Unit deleted']);
    }
}