<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class InitiatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Allow guest checkout
    }

    public function rules(): array
    {
        return [
            'sales_order_id' => 'required|integer|exists:sales_orders,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'required|string|max:20',
            'customer_address' => 'required|array',
            'customer_address.address_line1' => 'required|string|max:255',
            'customer_address.address_line2' => 'nullable|string|max:255',
            'customer_address.city' => 'required|string|max:100',
            'customer_address.district' => 'nullable|string|max:100',
            'customer_address.country' => 'required|string|max:100',
            'customer_address.postal_code' => 'nullable|string|max:20',
            'emi_option' => 'nullable|integer|between:0,13',
        ];
    }

    public function messages(): array
    {
        return [
            'sales_order_id.required' => 'Order ID is required',
            'sales_order_id.exists' => 'Order not found',
            'customer_name.required' => 'Customer name is required',
            'customer_phone.required' => 'Customer phone is required',
            'customer_address.required' => 'Shipping address is required',
            'emi_option.between' => 'Invalid EMI option selected',
        ];
    }

    protected function prepareForValidation()
    {
        // Get amount from sales_order if not provided
        if (!$this->has('amount') && $this->has('sales_order_id')) {
            $order = \App\Models\SalesOrder::find($this->sales_order_id);
            if ($order) {
                $this->merge([
                    'amount' => $order->due_amount,
                ]);
            }
        }
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $salesOrderId = $this->input('sales_order_id');

            if ($salesOrderId) {
                $order = \App\Models\SalesOrder::find($salesOrderId);

                // Check if order belongs to web channels
                if ($order && !in_array($order->channel, ['retail_web', 'wholesale_web'])) {
                    $validator->errors()->add('sales_order_id', 'Invalid order for online payment');
                }

                // Check if order is already fully paid
                if ($order && $order->payment_status === 'paid') {
                    $validator->errors()->add('sales_order_id', 'Order is already fully paid');
                }

                // Check for duplicate pending payment
                if ($order) {
                    $existingPayment = \App\Models\PaymentTransaction::where('sales_order_id', $salesOrderId)
                        ->where('status', 'pending')
                        ->where('created_at', '>', now()->subMinutes(30))
                        ->exists();

                    if ($existingPayment) {
                        $validator->errors()->add('sales_order_id', 'Payment already initiated for this order');
                    }
                }
            }
        });
    }
}
