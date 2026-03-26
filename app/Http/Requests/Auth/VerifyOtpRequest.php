<?php

namespace App\Http\Requests\Auth;

use App\Http\Requests\ApiRequest;

class VerifyOtpRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            'phone' => 'required|string|exists:users,phone',
            'otp' => 'required|string|digits:4', // 4 Digit Code
        ];
    }
}