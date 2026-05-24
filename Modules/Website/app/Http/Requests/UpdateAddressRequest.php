<?php

namespace App\Modules\Website\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateAddressRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Address Information
            'label' => 'sometimes|required|string|max:50',
            'full_name' => 'sometimes|required|string|min:2|max:255',
            'phone' => 'sometimes|required|string|regex:/^[0-9\+\-\s\(\)]+$/|min:10|max:20',
            'address_line' => 'sometimes|required|string|min:10|max:500',
            'division' => 'sometimes|required|string|max:100',
            'district' => 'sometimes|required|string|max:100',
            'thana' => 'sometimes|nullable|string|max:100',
            'postal_code' => 'sometimes|nullable|string|max:20',

            // Additional Information
            'landmark' => 'sometimes|nullable|string|max:255',
            'instructions' => 'sometimes|nullable|string|max:500',

            // Address Type
            'address_type' => 'sometimes|nullable|in:home,office,other',
            'is_default' => 'sometimes|nullable|boolean',
        ];
    }

    /**
     * Get custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            // Address Information
            'label.required' => 'Address label is required (e.g., Home, Office).',
            'label.max' => 'Label cannot exceed 50 characters.',
            'full_name.required' => 'Recipient name is required.',
            'full_name.min' => 'Recipient name must be at least 2 characters.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Invalid phone number format.',
            'phone.min' => 'Phone number must be at least 10 digits.',
            'address_line.required' => 'Address is required.',
            'address_line.min' => 'Address must be at least 10 characters.',
            'address_line.max' => 'Address cannot exceed 500 characters.',
            'division.required' => 'Division is required.',
            'district.required' => 'District is required.',
            'thana.max' => 'Thana cannot exceed 100 characters.',
            'postal_code.max' => 'Postal code cannot exceed 20 characters.',
            'landmark.max' => 'Landmark cannot exceed 255 characters.',
            'instructions.max' => 'Delivery instructions cannot exceed 500 characters.',
            'address_type.in' => 'Address type must be home, office, or other.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'label' => 'address label',
            'full_name' => 'recipient name',
            'phone' => 'phone number',
            'address_line' => 'address',
            'division' => 'division',
            'district' => 'district',
            'thana' => 'thana',
            'postal_code' => 'postal code',
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize phone number
        if ($this->has('phone')) {
            $this->merge([
                'phone' => preg_replace('/[^0-9\+]/', '', $this->phone),
            ]);
        }

        // Convert string boolean to actual boolean
        if ($this->has('is_default')) {
            $this->merge([
                'is_default' => filter_var($this->is_default, FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Address update validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
