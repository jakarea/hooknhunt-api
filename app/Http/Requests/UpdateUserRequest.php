<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only super_admin and admin can update users
        return in_array(auth()->user()->role, ['super_admin', 'admin']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $userId = $this->route('user')->id;

        $rules = [
            'name' => 'sometimes|required|string|max:255',
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($userId)],
            'phone_number' => ['sometimes', 'required', 'string', 'max:20', Rule::unique('users')->ignore($userId)],
            'whatsapp_number' => 'nullable|string|max:20',
            'password' => 'sometimes|nullable|string|min:8|confirmed',
            'role' => ['sometimes', 'required', Rule::in(['super_admin', 'admin', 'manager', 'supervisor', 'senior_staff', 'seller', 'store_keeper', 'marketer'])],
        ];

        // Only super_admin can assign super_admin role
        if (auth()->user()->role !== 'super_admin') {
            $rules['role'] = ['sometimes', 'required', Rule::in(['admin', 'manager', 'supervisor', 'senior_staff', 'seller', 'store_keeper', 'marketer'])];
        }

        return $rules;
    }

    /**
     * Get custom error messages for validation.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Name is required.',
            'email.required' => 'Email is required.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already taken.',
            'phone_number.required' => 'Phone number is required.',
            'phone_number.unique' => 'This phone number is already taken.',
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
            'role.required' => 'Role is required.',
            'role.in' => 'Invalid role selected.',
        ];
    }
}
