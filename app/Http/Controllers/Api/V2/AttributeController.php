<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Attribute;
use App\Models\AttributeOption;
use Illuminate\Http\Request;

class AttributeController extends Controller
{
    /**
     * List all attributes with their options
     */
    public function index()
    {
        return Attribute::with('options')->orderBy('sort_order')->get();
    }

    /**
     * Store a new attribute
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:attributes,name',
            'display_name' => 'required|string|max:255',
            'type' => 'required|in:text,number,select,multiselect,color,date,boolean',
            'is_required' => 'sometimes|boolean',
            'is_visible' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
            'options' => 'sometimes|array',
            'options.*.value' => 'required_with:options|string|max:255',
            'options.*.label' => 'nullable|string|max:255',
            'options.*.swatch_value' => 'nullable|string|max:255',
            'options.*.sort_order' => 'sometimes|integer',
        ]);

        // Set defaults
        $validated['is_required'] = $request->boolean('is_required', false);
        $validated['is_visible'] = $request->boolean('is_visible', true);
        $validated['sort_order'] = $validated['sort_order'] ?? 0;

        $attribute = Attribute::create($validated);

        // Create options if provided
        if (isset($validated['options']) && is_array($validated['options'])) {
            foreach ($validated['options'] as $option) {
                AttributeOption::create([
                    'attribute_id' => $attribute->id,
                    'value' => $option['value'],
                    'label' => $option['label'] ?? $option['value'],
                    'swatch_value' => $option['swatch_value'] ?? null,
                    'sort_order' => $option['sort_order'] ?? 0,
                ]);
            }
        }

        return response()->json($attribute->load('options'), 201);
    }

    /**
     * Show a single attribute with options
     */
    public function show($id)
    {
        return Attribute::with('options')->findOrFail($id);
    }

    /**
     * Update an attribute
     */
    public function update(Request $request, $id)
    {
        $attribute = Attribute::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:attributes,name,' . $id,
            'display_name' => 'sometimes|required|string|max:255',
            'type' => 'sometimes|required|in:text,number,select,multiselect,color,date,boolean',
            'is_required' => 'sometimes|boolean',
            'is_visible' => 'sometimes|boolean',
            'sort_order' => 'sometimes|integer',
            'options' => 'sometimes|array',
            'options.*.id' => 'sometimes|integer|exists:attribute_options,id',
            'options.*.value' => 'required_with:options|string|max:255',
            'options.*.label' => 'nullable|string|max:255',
            'options.*.swatch_value' => 'nullable|string|max:255',
            'options.*.sort_order' => 'sometimes|integer',
        ]);

        // Update attribute fields
        $attribute->update([
            'name' => $validated['name'] ?? $attribute->name,
            'display_name' => $validated['display_name'] ?? $attribute->display_name,
            'type' => $validated['type'] ?? $attribute->type,
            'is_required' => $validated['is_required'] ?? $attribute->is_required,
            'is_visible' => $validated['is_visible'] ?? $attribute->is_visible,
            'sort_order' => $validated['sort_order'] ?? $attribute->sort_order,
        ]);

        // Update options if provided
        if (isset($validated['options']) && is_array($validated['options'])) {
            // Get existing option IDs
            $existingOptionIds = $attribute->options->pluck('id')->toArray();

            foreach ($validated['options'] as $optionData) {
                if (isset($optionData['id'])) {
                    // Update existing option
                    $option = AttributeOption::find($optionData['id']);
                    if ($option && $option->attribute_id === $attribute->id) {
                        $option->update([
                            'value' => $optionData['value'],
                            'label' => $optionData['label'] ?? $optionData['value'],
                            'swatch_value' => $optionData['swatch_value'] ?? null,
                            'sort_order' => $optionData['sort_order'] ?? 0,
                        ]);
                        // Remove from existing IDs list
                        $existingOptionIds = array_diff($existingOptionIds, [$optionData['id']]);
                    }
                } else {
                    // Create new option
                    AttributeOption::create([
                        'attribute_id' => $attribute->id,
                        'value' => $optionData['value'],
                        'label' => $optionData['label'] ?? $optionData['value'],
                        'swatch_value' => $optionData['swatch_value'] ?? null,
                        'sort_order' => $optionData['sort_order'] ?? 0,
                    ]);
                }
            }

            // Delete options that were not in the update
            foreach ($existingOptionIds as $idToDelete) {
                AttributeOption::where('id', $idToDelete)->delete();
            }
        }

        return response()->json($attribute->load('options'));
    }

    /**
     * Delete an attribute
     */
    public function destroy($id)
    {
        $attribute = Attribute::findOrFail($id);
        $attribute->delete();
        return response()->json(['message' => 'Attribute deleted successfully']);
    }
}
