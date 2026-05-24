<?php

namespace App\Modules\CRM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('crm.customers.create');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:2|max:255',
            'phone' => 'required|string|regex:/^[0-9\+\-\s\(\)]+$/|min:10|max:20|unique:users,phone',
            'email' => 'nullable|email|max:255|unique:users,email',
            'type' => 'nullable|in:retail,wholesale',
            
            // Profile
            'address' => 'nullable|string|max:500',
            'division' => 'nullable|string|max:100',
            'district' => 'nullable|string|max:100',
            'thana' => 'nullable|string|max:100',
            'date_of_birth' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female,other',
            
            // Business
            'trade_license_no' => 'nullable|string|max:255',
            'tax_id' => 'nullable|string|max:255',
            
            // Marketing
            'source' => 'nullable|string|max:100',
            'medium' => 'nullable|string|max:100',
            'preferred_language' => 'nullable|in:en,bn',
            'marketing_consent' => 'nullable|boolean',
            'do_not_contact' => 'nullable|boolean',
            
            // Notes
            'notes' => 'nullable|string|max:2000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Customer name is required.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Invalid phone number format.',
            'phone.unique' => 'This phone number is already registered.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already registered.',
            'type.in' => 'Type must be retail or wholesale.',
            'gender.in' => 'Gender must be male, female, or other.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('phone')) {
            $this->merge(['phone' => preg_replace('/[^0-9\+]/', '', $this->phone)]);
        }
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Customer creation validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
