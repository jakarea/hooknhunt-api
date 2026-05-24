<?php

namespace App\Modules\Procurement\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreSupplierRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('procurement.suppliers.create');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Basic Information
            'name' => 'required|string|min:2|max:255',
            'shop_name' => 'nullable|string|max:255',
            'code' => 'nullable|string|max:50|unique:suppliers,code',

            // Contact Information
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'required|string|regex:/^[0-9\+\-\s\(\)]+$/|min:10|max:20',
            'whatsapp' => 'nullable|string|regex:/^[0-9\+\-\s\(\)]+$/|min:10|max:20',
            'email' => 'nullable|email|max:255|unique:suppliers,email',

            // Address Information
            'address' => 'nullable|string|max:500',
            'division' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'thana' => 'nullable|string|max:100',

            // Business Details
            'trade_license' => 'nullable|string|max:255',
            'tax_id' => 'nullable|string|max:255',
            'bin_number' => 'nullable|string|max:255',

            // Payment Information
            'payment_terms' => 'nullable|string|max:255',
            'credit_limit' => 'nullable|numeric|min:0|max:999999999.99',
            'credit_days' => 'nullable|integer|min:0|max:365',

            // Banking Information
            'bank_name' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:50',
            'bkash_number' => 'nullable|string|regex:/^[0-9\+]+$/|max:20',
            'nagad_number' => 'nullable|string|regex:/^[0-9\+]+$/|max:20',

            // Status and Notes
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:2000',

            // Product Categories (supplier can supply)
            'category_ids' => 'nullable|array',
            'category_ids.*' => 'exists:categories,id',
        ];
    }

    /**
     * Get custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Supplier name is required.',
            'name.min' => 'Supplier name must be at least 2 characters.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Invalid phone number format.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already registered.',
            'credit_limit.numeric' => 'Credit limit must be a valid number.',
            'credit_days.integer' => 'Credit days must be a whole number.',
            'category_ids.*.exists' => 'One or more selected categories do not exist.',
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize phone numbers
        if ($this->has('phone')) {
            $this->merge(['phone' => preg_replace('/[^0-9\+]/', '', $this->phone)]);
        }

        // Set default values
        $this->merge([
            'is_active' => filter_var($this->is_active ?? true, FILTER_VALIDATE_BOOLEAN),
            'credit_days' => $this->credit_days ?? 0,
            'credit_limit' => $this->credit_limit ?? 0,
        ]);
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Supplier creation validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
