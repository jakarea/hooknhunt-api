<?php

namespace App\Modules\Website\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UpdateProfileRequest extends FormRequest
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
        $userId = auth()->id();

        return [
            // Basic Information
            'name' => 'sometimes|required|string|min:2|max:255',
            'phone' => 'sometimes|required|string|regex:/^[0-9\+\-\s\(\)]+$/|min:10|max:20|unique:users,phone,' . $userId,
            'email' => 'sometimes|nullable|email|max:255|unique:users,email,' . $userId,

            // Profile Information
            'date_of_birth' => 'sometimes|nullable|date|before:today',
            'gender' => 'sometimes|nullable|in:male,female,other',
            'profile_image' => 'sometimes|nullable|image|mimes:jpeg,png,jpg,gif|max:5120', // 5MB

            // Address Information
            'address' => 'sometimes|nullable|string|max:500',
            'division' => 'sometimes|nullable|string|max:100',
            'district' => 'sometimes|nullable|string|max:100',
            'thana' => 'sometimes|nullable|string|max:100',

            // Preferences
            'preferred_language' => 'sometimes|nullable|string|in:en,bn',
            'preferred_currency' => 'sometimes|nullable|string|in:BDT,USD',
            'marketing_consent' => 'sometimes|nullable|boolean',
            'do_not_contact' => 'sometimes|nullable|boolean',

            // Business Information (for wholesale customers)
            'trade_license_no' => 'sometimes|nullable|string|max:255',
            'tax_id' => 'sometimes|nullable|string|max:255',
        ];
    }

    /**
     * Get custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            // Basic Information
            'name.required' => 'Name is required.',
            'name.min' => 'Name must be at least 2 characters.',
            'name.max' => 'Name cannot exceed 255 characters.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Invalid phone number format.',
            'phone.unique' => 'This phone number is already registered.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already registered.',

            // Profile Information
            'date_of_birth.date' => 'Invalid date format for date of birth.',
            'date_of_birth.before' => 'Date of birth must be before today.',
            'gender.in' => 'Gender must be male, female, or other.',
            'profile_image.image' => 'Profile image must be an image file.',
            'profile_image.mimes' => 'Profile image must be a JPEG, PNG, JPG, or GIF file.',
            'profile_image.max' => 'Profile image cannot exceed 5MB.',

            // Address Information
            'address.max' => 'Address cannot exceed 500 characters.',
            'division.max' => 'Division cannot exceed 100 characters.',
            'district.max' => 'District cannot exceed 100 characters.',
            'thana.max' => 'Thana cannot exceed 100 characters.',

            // Preferences
            'preferred_language.in' => 'Preferred language must be English or Bengali.',
            'preferred_currency.in' => 'Preferred currency must be BDT or USD.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'name' => 'name',
            'phone' => 'phone number',
            'email' => 'email address',
            'date_of_birth' => 'date of birth',
            'profile_image' => 'profile picture',
            'division' => 'division',
            'district' => 'district',
            'thana' => 'thana',
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

        // Convert boolean strings to actual booleans
        if ($this->has('marketing_consent')) {
            $this->merge([
                'marketing_consent' => filter_var($this->marketing_consent, FILTER_VALIDATE_BOOLEAN),
            ]);
        }

        if ($this->has('do_not_contact')) {
            $this->merge([
                'do_not_contact' => filter_var($this->do_not_contact, FILTER_VALIDATE_BOOLEAN),
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
                'message' => 'Profile update validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
