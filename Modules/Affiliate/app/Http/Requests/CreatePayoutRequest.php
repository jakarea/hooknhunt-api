<?php

namespace App\Modules\Affiliate\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class CreatePayoutRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('affiliate.payouts.create');
    }

    public function rules(): array
    {
        return [
            'affiliate_id' => 'required|exists:affiliates,id',
            'amount' => 'required|numeric|min:100|max:999999999.99',
            'payment_method' => 'required|in:bkash,nagad,bank_transfer',
            'account_details' => 'required|array',
            'account_details.account_name' => 'required|string|max:255',
            'account_details.account_number' => 'required|string|max:255',
            'account_details.bank_name' => 'nullable|string|max:255',
            'account_details.branch_name' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:1000',
        ];
    }

    public function messages(): array
    {
        return [
            'affiliate_id.required' => 'Affiliate ID is required.',
            'affiliate_id.exists' => 'Selected affiliate does not exist.',
            'amount.required' => 'Amount is required.',
            'amount.min' => 'Minimum payout amount is 100.',
            'payment_method.required' => 'Payment method is required.',
            'payment_method.in' => 'Invalid payment method selected.',
            'account_details.required' => 'Account details are required.',
            'account_details.account_name.required' => 'Account name is required.',
            'account_details.account_number.required' => 'Account number is required.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Payout creation validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
