<?php

namespace App\Modules\Shipping\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreateCourierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('shipping.couriers.create');
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|min:2|max:255',
            'code' => 'required|string|max:50|unique:couriers,code',
            'api_provider' => 'required|in:steadfast,redx,parceldar,pathao,other',
            'api_key' => 'nullable|string|max:255',
            'api_secret' => 'nullable|string|max:255',
            'api_url' => 'nullable|url|max:500',
            'contact_phone' => 'nullable|string|max:20',
            'contact_email' => 'nullable|email|max:255',
            'is_active' => 'nullable|boolean',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Courier name is required.',
            'code.required' => 'Courier code is required.',
            'code.unique' => 'This courier code is already registered.',
            'api_provider.required' => 'API provider is required.',
            'api_provider.in' => 'Invalid API provider selected.',
            'api_url.url' => 'API URL must be a valid URL.',
            'contact_email.email' => 'Please provide a valid email address.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge(['is_active' => filter_var($this->is_active ?? true, FILTER_VALIDATE_BOOLEAN)]);
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Courier creation validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
