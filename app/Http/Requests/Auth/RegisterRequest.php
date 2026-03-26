<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

class RegisterRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone|regex:/^01[3-9]\d{8}$/', // BD Phone Format
            'email' => 'nullable|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed', // password_confirmation field required
        ];
    }

    public function messages()
    {
        return [
            'phone.regex' => 'Please provide a valid Bangladeshi phone number (e.g., 017xxxxxxxx).',
            'phone.unique' => 'This phone number is already registered.',
        ];
    }
}