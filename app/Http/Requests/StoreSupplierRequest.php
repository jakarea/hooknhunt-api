<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'shop_name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255|unique:suppliers',
            'shop_url' => 'nullable|url',
            'wechat_id' => 'nullable|string|max:255',
            'wechat_qr_file' => 'nullable|file|image|mimes:jpeg,png,jpg,gif|max:100',
            'wechat_qr_url' => 'nullable|string|max:255',
            'alipay_id' => 'nullable|string|max:255',
            'alipay_qr_file' => 'nullable|file|image|mimes:jpeg,png,jpg,gif|max:100',
            'alipay_qr_url' => 'nullable|string|max:255',
            'contact_info' => 'nullable|string',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'wechat_qr_file.image' => 'The WeChat QR code must be an image file.',
            'wechat_qr_file.max' => 'The WeChat QR code may not be larger than 100KB.',
            'alipay_qr_file.image' => 'The Alipay QR code must be an image file.',
            'alipay_qr_file.max' => 'The Alipay QR code may not be larger than 100KB.',
        ];
    }
}
