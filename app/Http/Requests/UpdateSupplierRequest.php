<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSupplierRequest extends FormRequest
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
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        $supplierId = $this->route('supplier');

        return [
            'name' => 'sometimes|required|string|max:255',
            'email' => ['nullable', 'email', 'max:255', Rule::unique('suppliers')->ignore($supplierId)],
            'whatsapp' => 'nullable|string|max:255',
            'shop_url' => 'nullable|url|max:500',
            'shop_name' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'wechat_id' => 'nullable|string|max:255',
            'wechat_qr_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'wechat_qr_url' => 'nullable|url|max:500',
            'alipay_id' => 'nullable|string|max:255',
            'alipay_qr_file' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'alipay_qr_url' => 'nullable|url|max:500',
            'address' => 'nullable|string|max:500',
            'is_active' => 'nullable|boolean',
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
            'name.required' => 'Supplier name is required.',
            'email.email' => 'Please provide a valid email address.',
            'shop_url.url' => 'Please provide a valid URL for the shop.',
            'wechat_qr_file.image' => 'The WeChat QR code must be an image file.',
            'wechat_qr_file.mimes' => 'The WeChat QR code must be a JPEG, PNG, JPG, GIF, or SVG file.',
            'wechat_qr_file.max' => 'The WeChat QR code may not be larger than 2MB.',
            'alipay_qr_file.image' => 'The Alipay QR code must be an image file.',
            'alipay_qr_file.mimes' => 'The Alipay QR code must be a JPEG, PNG, JPG, GIF, or SVG file.',
            'alipay_qr_file.max' => 'The Alipay QR code may not be larger than 2MB.',
            'wechat_qr_url.url' => 'Please provide a valid URL for the WeChat QR code.',
            'alipay_qr_url.url' => 'Please provide a valid URL for the Alipay QR code.',
        ];
    }
}
