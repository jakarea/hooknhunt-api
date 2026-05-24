<?php

namespace App\Modules\HRM\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateStaffRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('hrm.staff.create');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:2|max:255',
            'phone' => 'required|string|regex:/^[0-9\+\-\s\(\)]+$/|min:10|max:20|unique:users,phone',
            'email' => 'nullable|email|max:255|unique:users,email',
            'department_id' => 'required|exists:departments,id',
            'designation' => 'required|string|max:255',
            'joining_date' => 'required|date|before_or_equal:today',
            'base_salary' => 'nullable|numeric|min:0|max:999999999.99',
            'address' => 'nullable|string|max:500',
            'date_of_birth' => 'nullable|date|before:today',
            'gender' => 'nullable|in:male,female,other',
            'emergency_contact' => 'nullable|string|max:255',
            'emergency_phone' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Staff name is required.',
            'phone.required' => 'Phone number is required.',
            'phone.regex' => 'Invalid phone number format.',
            'phone.unique' => 'This phone number is already registered.',
            'email.email' => 'Please provide a valid email address.',
            'email.unique' => 'This email is already registered.',
            'department_id.required' => 'Department is required.',
            'department_id.exists' => 'Selected department does not exist.',
            'designation.required' => 'Designation is required.',
            'joining_date.required' => 'Joining date is required.',
            'joining_date.before_or_equal' => 'Joining date cannot be in the future.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('phone')) {
            $this->merge(['phone' => preg_replace('/[^0-9\+]/', '', $this->phone)]);
        }
        $this->merge(['is_active' => filter_var($this->is_active ?? true, FILTER_VALIDATE_BOOLEAN)]);
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Staff creation validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
