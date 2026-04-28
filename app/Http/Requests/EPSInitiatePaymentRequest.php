<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Log;

class EPSInitiatePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'sales_order_id' => 'required|integer|exists:sales_orders,id',
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email|max:255',
            'customer_phone' => 'required|string|max:20',
            'customer_address' => 'required|array',
            'customer_address.address' => 'required|string|max:500',
            'customer_address.address_line1' => 'nullable|string|max:255',
            'customer_address.address_line2' => 'nullable|string|max:255',
            'customer_address.thana' => 'nullable|string|max:100',
            'customer_address.city' => 'nullable|string|max:100',
            'customer_address.district' => 'nullable|string|max:100',
            'customer_address.division' => 'nullable|string|max:100',
            'customer_address.state' => 'nullable|string|max:100',
            'customer_address.postal_code' => 'nullable|string|max:20',
            'customer_address.country' => 'nullable|string|max:100',
            'shipping_address' => 'nullable|array',
            'shipping_name' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'sales_order_id.required' => 'Order ID is required',
            'sales_order_id.exists' => 'Order not found',
            'customer_name.required' => 'Customer name is required',
            'customer_phone.required' => 'Customer phone is required',
            'customer_address.required' => 'Customer address is required',
        ];
    }

    protected function prepareForValidation()
    {
        $address = $this->customer_address ?? [];

        if (isset($address['address_line1']) && !isset($address['address'])) {
            $address['address'] = $address['address_line1'];
            if (isset($address['address_line2'])) {
                $address['address'] .= ', ' . $address['address_line2'];
            }
        }

        if (isset($address['city']) && !isset($address['thana'])) {
            $address['thana'] = $address['city'];
        }

        if (isset($address['state']) && !isset($address['division'])) {
            $address['division'] = $address['state'];
        }

        $this->merge(['customer_address' => $address]);

        if (!$this->has('amount') && $this->has('sales_order_id')) {
            $order = \App\Models\SalesOrder::find($this->sales_order_id);
            if ($order) {
                $this->merge(['amount' => $order->due_amount]);
            }
        }
    }

    public function withValidator($validator)
    {
        $validator->after(function ($validator) {
            $salesOrderId = $this->input('sales_order_id');

            if ($salesOrderId) {
                $order = \App\Models\SalesOrder::find($salesOrderId);

                if ($order && !in_array($order->channel, ['retail_web', 'wholesale_web'])) {
                    $validator->errors()->add('sales_order_id', 'Invalid order for online payment');
                }

                if ($order && $order->payment_status === 'paid') {
                    $validator->errors()->add('sales_order_id', 'Order is already fully paid');
                }

                if ($order) {
                    $existingPayment = \App\Models\PaymentTransaction::where('sales_order_id', $salesOrderId)
                        ->where('gateway', 'eps')
                        ->where('status', 'pending')
                        ->where('created_at', '>', now()->subMinutes(30))
                        ->exists();

                    if ($existingPayment) {
                        $validator->errors()->add('sales_order_id', 'EPS payment already initiated for this order');
                    }
                }
            }
        });
    }
}
