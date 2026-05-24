<?php

namespace App\Modules\Inventory\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateWarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('inventory.warehouses.create');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:2|max:255',
            'code' => 'required|string|max:50|unique:warehouses,code',
            'address' => 'nullable|string|max:500',
            'division' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'manager_name' => 'nullable|string|max:255',
            'manager_phone' => 'nullable|string|max:20',
            'capacity' => 'nullable|numeric|min:0|max:999999999.99',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Warehouse name is required.',
            'code.required' => 'Warehouse code is required.',
            'code.unique' => 'This warehouse code is already registered.',
            'capacity.numeric' => 'Capacity must be a valid number.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['is_active' => filter_var($this->is_active ?? true, FILTER_VALIDATE_BOOLEAN)]);
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Warehouse creation validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
