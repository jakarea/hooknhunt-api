<?php

namespace App\Modules\Website\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class PlaceOrderRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     * Guests and authenticated users can place orders.
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
            // Customer Information (optional if customer_id provided)
            'customer_id' => 'nullable|integer|exists:customers,id',
            'customer_name' => 'required_without:customer_id|string|min:2|max:255',
            'customer_phone' => 'required_without:customer_id|string|regex:/^01[3-9]\d{8}$/',
            'customer_email' => 'nullable|email|max:255',
            'customer_type' => 'nullable|in:retail,wholesale',

            // Order Items
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.variant_id' => 'nullable|integer|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1|max:1000',
            'items.*.unit_price' => 'required|numeric|min:0|max:99999999.99',

            // Shipping Information (optional if shipping_address_id provided)
            'shipping_address_id' => 'nullable|integer|exists:addresses,id',
            'shipping_address' => 'required_without:shipping_address_id|string|min:10|max:1000',
            'shipping_district' => 'nullable|string|max:100',
            'shipping_division' => 'nullable|string|max:100',
            'shipping_thana' => 'nullable|string|max:100',

            // Payment Information
            'payment_method' => 'required|string|in:cod,sslcommerz,eps,bkash,nagad,rocket',
            'payment_details' => 'nullable|string|max:500',

            // Order Totals
            'subtotal' => 'required|numeric|min:0|max:99999999.99',
            'delivery_charge' => 'nullable|numeric|min:0|max:99999.99',
            'coupon_discount' => 'nullable|numeric|min:0|max:99999999.99',
            'payable_amount' => 'required|numeric|min:0|max:99999999.99',

            // Additional Information
            'notes' => 'nullable|string|max:2000',
            'coupon_code' => 'nullable|string|max:50|exists:coupons,code',

            // Wholesale specific fields
            'trade_license' => 'nullable|string|max:255',
            'tax_id' => 'nullable|string|max:255',
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
            'customer_email.email' => 'Please provide a valid email address.',
            'customer_type.in' => 'Customer type must be either retail or wholesale.',

            // Order Items
            'items.required' => 'At least one product is required to place an order.',
            'items.array' => 'Order items must be an array.',
            'items.min' => 'At least one product is required to place an order.',
            'items.*.product_id.required' => 'Product ID is required for each item.',
            'items.*.product_id.exists' => 'One or more products do not exist.',
            'items.*.variant_id.exists' => 'One or more product variants do not exist.',
            'items.*.quantity.required' => 'Quantity is required for each item.',
            'items.*.quantity.min' => 'Quantity must be at least 1.',
            'items.*.quantity.max' => 'Quantity cannot exceed 1000 per item.',
            'items.*.unit_price.required' => 'Unit price is required for each item.',
            'items.*.unit_price.numeric' => 'Unit price must be a valid number.',
            'items.*.unit_price.min' => 'Unit price cannot be negative.',

            // Shipping Information
            'shipping_address.required' => 'Shipping address is required.',
            'shipping_address.min' => 'Shipping address must be at least 10 characters.',
            'shipping_address.max' => 'Shipping address cannot exceed 1000 characters.',

            // Payment Information
            'payment_method.required' => 'Payment method is required.',
            'payment_method.in' => 'Invalid payment method selected.',

            // Order Totals
            'subtotal.required' => 'Order subtotal is required.',
            'subtotal.numeric' => 'Subtotal must be a valid number.',
            'payable_amount.required' => 'Payable amount is required.',
            'payable_amount.numeric' => 'Payable amount must be a valid number.',
            'payable_amount.min' => 'Payable amount cannot be negative.',

            // Coupon
            'coupon_code.exists' => 'Invalid or expired coupon code.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'customer_name' => 'customer name',
            'customer_phone' => 'phone number',
            'customer_email' => 'email address',
            'shipping_address' => 'shipping address',
            'payment_method' => 'payment method',
            'payable_amount' => 'total amount',
        ];
    }

    /**
     * Prepare inputs for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normalize Bangladesh phone number
        // Remove all non-digit characters (spaces, dashes, +88 prefix, etc.)
        if ($this->has('customer_phone')) {
            $normalizedPhone = preg_replace('/[^0-9]/', '', $this->customer_phone);

            // Handle +88 country code prefix
            // If number starts with 8801, remove 88 to get 01 format
            if (strlen($normalizedPhone) === 13 && str_starts_with($normalizedPhone, '880')) {
                $normalizedPhone = substr($normalizedPhone, 2); // Remove 88 prefix
            }

            $this->merge([
                'customer_phone' => $normalizedPhone,
            ]);
        }

        // Set default values
        $this->merge([
            'customer_type' => $this->customer_type ?? 'retail',
            'delivery_charge' => $this->delivery_charge ?? 0,
            'coupon_discount' => $this->coupon_discount ?? 0,
        ]);
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
        return array_merge([
            'customer_type' => 'retail',
            'delivery_charge' => 0,
            'coupon_discount' => 0,
            'notes' => null,
            'coupon_code' => null,
        ], $this->validated());
    }
}
