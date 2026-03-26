<?php

namespace App\Services\Payment;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BkashService
{
    // Sandbox Credentials (Mock)
    protected $baseUrl = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta';
    protected $appKey = 'test_app_key';
    protected $appSecret = 'test_app_secret';
    protected $username = 'test_user';
    protected $password = 'test_pass';

    /**
     * 1. Get Token (Grant Token)
     * bKash এ প্রতিটি রিকোয়েস্টের আগে টোকেন নিতে হয়
     */
    public function grantToken()
    {
        // Mock Token Return
        return 'mock_token_' . time();
    }

    /**
     * 2. Create Payment (Generate URL)
     */
    public function createPayment($order, $amount)
    {
        // MOCK MODE: আমরা রিয়েল API কল না করে ফেইক URL দিচ্ছি
        return [
            'status' => 'success',
            'paymentID' => 'BKASH-' . $order->invoice_no,
            'bkashURL' => route('bkash.mock.page', ['id' => $order->id]), // আমাদের বানানো একটি ফেইক পেমেন্ট পেজ
            'message' => 'Payment Initiated'
        ];
    }

    /**
     * 3. Execute Payment (Verify)
     */
    public function executePayment($paymentID)
    {
        // MOCK MODE: পেমেন্ট সাকসেসফুল ধরে নিচ্ছি
        return [
            'status' => 'success',
            'trxID' => 'TRX-' . strtoupper(uniqid()),
            'paymentID' => $paymentID,
            'amount' => '100.00',
            'message' => 'Payment Successful'
        ];
    }
}