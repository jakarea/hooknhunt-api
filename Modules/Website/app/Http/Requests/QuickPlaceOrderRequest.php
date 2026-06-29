<?php

namespace App\Modules\Website\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class QuickPlaceOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Guests can place orders from landing pages.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            // Customer Information
            'customer_name' => 'required|string|min:2|max:255',
            'customer_phone' => 'required|string|regex:/^01[3-9]\d{8}$/',

            // Shipping Information
            'shipping_address' => 'required|string|min:10|max:1000',

            // Order Items - array of products
            'items' => 'required|array|min:1|max:10',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'required|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1|max:1000',

            // Affiliate Tracking (optional)
            'affiliate_referral_code' => 'nullable|string|max:50',
            'affiliate_referral_id' => 'nullable|integer',
        ];
    }

    /**
     * Get custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            // Customer Information
            'customer_name.required' => 'Customer name is required.',
            'customer_name.min' => 'Customer name must be at least 2 characters.',
            'customer_name.max' => 'Customer name cannot exceed 255 characters.',
            'customer_phone.required' => 'Customer phone number is required.',
            'customer_phone.regex' => 'Invalid Bangladesh phone number format. Must be 11 digits starting with 01 (e.g., 01712345678).',

            // Shipping Information
            'shipping_address.required' => 'Shipping address is required.',
            'shipping_address.min' => 'Shipping address must be at least 10 characters.',
            'shipping_address.max' => 'Shipping address cannot exceed 1000 characters.',

            // Order Items
            'items.required' => 'At least one product is required to place an order.',
            'items.array' => 'Order items must be an array.',
            'items.min' => 'At least one product is required to place an order.',
            'items.max' => 'Maximum 10 items allowed per order.',
            'items.*.product_id.required' => 'Product ID is required for each item.',
            'items.*.product_id.exists' => 'One or more products do not exist.',
            'items.*.variant_id.required' => 'Variant ID is required for each item.',
            'items.*.variant_id.exists' => 'One or more variants do not exist.',
            'items.*.quantity.required' => 'Quantity is required for each item.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
            'items.*.quantity.max' => 'Quantity cannot exceed 1000 per item.',

            // Affiliate Tracking
            'affiliate_referral_code.max' => 'Referral code cannot exceed 50 characters.',
        ];
    }

    /**
     * Configure the validator instance.
     * Validate referral code if provided.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $referralCode = $this->input('affiliate_referral_code');
            $referralId = $this->input('affiliate_referral_id');

            // Validate referral code if provided
            if ($referralCode) {
                $affiliate = \App\Modules\Affiliate\Models\Affiliate::where('referral_code', strtoupper($referralCode))
                    ->where('is_approved', true)
                    ->first();

                if (!$affiliate) {
                    $validator->errors()->add('affiliate_referral_code', 'Invalid or inactive referral code.');
                }
            }

            // Validate referral ID if provided
            if ($referralId) {
                $referral = \App\Modules\Affiliate\Models\AffiliateReferral::find($referralId);

                if (!$referral) {
                    $validator->errors()->add('affiliate_referral_id', 'Invalid referral ID.');
                }
            }
        });
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'customer_name' => 'customer name',
            'phone_number' => 'phone number',
            'email_address' => 'email address',
            'shipping_address' => 'shipping address',
            'affiliate_referral_code' => 'referral code',
            'affiliate_referral_id' => 'referral ID',
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize Bangladesh phone number
        if ($this->has('customer_phone')) {
            $normalizedPhone = preg_replace('/[^0-9]/', '', $this->customer_phone);

            if (strlen($normalizedPhone) === 13 && str_starts_with($normalizedPhone, '880')) {
                $normalizedPhone = substr($normalizedPhone, 2);
            }

            $this->merge([
                'customer_phone' => $normalizedPhone,
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
                'message' => 'Order validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }

    /**
     * Get validated data with default values.
     */
    public function validatedWithDefaults(): array
    {
        $validated = $this->validated();

        // Normalize referral code to uppercase
        if (isset($validated['affiliate_referral_code'])) {
            $validated['affiliate_referral_code'] = strtoupper($validated['affiliate_referral_code']);
        }

        return array_merge([
            'customer_type' => 'retail',
            'payment_method' => 'cod',
            'delivery_charge' => 0,
            'coupon_discount' => 0,
            'notes' => null,
            'affiliate_referral_code' => null,
            'affiliate_referral_id' => null,
        ], $validated);
    }
}