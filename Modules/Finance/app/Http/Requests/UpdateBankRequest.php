<?php

namespace App\Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateBankRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('finance.banks.edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $bankId = $this->route('id');

        return [
            // Bank Information
            'name' => 'sometimes|required|string|min:2|max:255',
            'bank_code' => ['sometimes', 'required', 'string', 'max:20', 'unique:banks,bank_code,' . $bankId],
            'branch_name' => 'nullable|string|max:255',
            'branch_code' => ['nullable', 'string', 'max:50', 'unique:banks,branch_code,' . $bankId],

            // Account Information
            'account_name' => 'sometimes|required|string|max:255',
            'account_number' => ['sometimes', 'required', 'string', 'max:50', 'unique:banks,account_number,' . $bankId],
            'account_type' => 'sometimes|required|in:savings,current,checking,fixed_deposit',

            // Contact Information
            'contact_person' => 'nullable|string|max:255',
            'contact_phone' => 'nullable|string|regex:/^[0-9\+\-\s\(\)]+$/|max:20',
            'contact_email' => 'nullable|email|max:255',
            'address' => 'nullable|string|max:500',

            // Banking Details
            'routing_number' => 'nullable|string|max:50',
            'swift_code' => 'nullable|string|max:20',
            'iban' => 'nullable|string|max:50',

            // Status
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    /**
     * Get custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            // Bank Information
            'name.required' => 'Bank name is required.',
            'name.min' => 'Bank name must be at least 2 characters.',
            'name.max' => 'Bank name cannot exceed 255 characters.',
            'bank_code.required' => 'Bank code is required.',
            'bank_code.unique' => 'This bank code is already registered.',
            'branch_code.unique' => 'This branch code is already registered.',

            // Account Information
            'account_name.required' => 'Account name is required.',
            'account_number.required' => 'Account number is required.',
            'account_number.unique' => 'This account number is already registered.',
            'account_type.required' => 'Account type is required.',
            'account_type.in' => 'Account type must be savings, current, checking, or fixed deposit.',

            // Contact Information
            'contact_phone.regex' => 'Invalid phone number format.',
            'contact_email.email' => 'Please provide a valid email address.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'name' => 'bank name',
            'bank_code' => 'bank code',
            'branch_name' => 'branch name',
            'account_name' => 'account name',
            'account_number' => 'account number',
            'account_type' => 'account type',
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize phone number
        if ($this->has('contact_phone')) {
            $this->merge([
                'contact_phone' => preg_replace('/[^0-9\+]/', '', $this->contact_phone),
            ]);
        }

        // Convert string boolean to actual boolean
        if ($this->has('is_active')) {
            $this->merge([
                'is_active' => filter_var($this->is_active, FILTER_VALIDATE_BOOLEAN),
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
                'message' => 'Bank update validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
