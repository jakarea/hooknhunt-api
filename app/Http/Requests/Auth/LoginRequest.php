<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest; // আমাদের বানানো Base Request

class LoginRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'login_id' => 'required|string', // Email or Phone
            'password' => 'required|string|min:6',
        ];
    }

    public function messages()
    {
        return [
            'login_id.required' => 'Email or Phone number is required',
            'password.min' => 'Password must be at least 6 characters'
        ];
    }
}