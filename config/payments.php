<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Payment Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains payment gateway and transaction configuration.
    |
    */

    /*
     * Default Payment Gateway
     */
    'default_gateway' => env('DEFAULT_PAYMENT_GATEWAY', 'sslcommerz'),

    /*
     * Available Payment Gateways
     */
    'gateways' => [
        'sslcommerz' => [
            'name' => 'SSLCommerz',
            'enabled' => env('SSLCOMMERZ_ENABLED', true),
            'store_id' => env('SSLCOMMERZ_STORE_ID'),
            'store_password' => env('SSLCOMMERZ_STORE_PASSWORD'),
            'sandbox' => env('SSLCOMMERZ_SANDBOX', true),
            'sandbox_url' => 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php',
            'live_url' => 'https://securepay.sslcommerz.com/gwprocess/v4/api.php',
            'ipn_url' => '/api/v2/store/payments/ipn',
        ],

        'eps' => [
            'name' => 'EPS (Eastern Payment Solutions)',
            'enabled' => env('EPS_ENABLED', true),
            'merchant_id' => env('EPS_MERCHANT_ID'),
            'secret_key' => env('EPS_SECRET_KEY'),
            'sandbox' => env('EPS_SANDBOX', true),
            'sandbox_url' => 'https://demo-eps.netpay.com/secure/PaymentServlet',
            'live_url' => 'https://secure.netpay.com/secure/PaymentServlet',
            'ipn_url' => '/api/v2/store/payments/eps/ipn',
        ],

        'bkash' => [
            'name' => 'bKash',
            'enabled' => env('BKASH_ENABLED', false),
            'app_key' => env('BKASH_APP_KEY'),
            'app_secret' => env('BKASH_APP_SECRET'),
            'username' => env('BKASH_USERNAME'),
            'password' => env('BKASH_PASSWORD'),
            'sandbox' => env('BKASH_SANDBOX', true),
        ],

        'nagad' => [
            'name' => 'Nagad',
            'enabled' => env('NAGAD_ENABLED', false),
            'merchant_id' => env('NAGAD_MERCHANT_ID'),
            'public_key' => env('NAGAD_PUBLIC_KEY'),
            'private_key' => env('NAGAD_PRIVATE_KEY'),
            'sandbox' => env('NAGAD_SANDBOX', true),
        ],

        'rocket' => [
            'name' => 'Rocket',
            'enabled' => env('ROCKET_ENABLED', false),
            'merchant_id' => env('ROCKET_MERCHANT_ID'),
            'secret_key' => env('ROCKET_SECRET_KEY'),
            'sandbox' => env('ROCKET_SANDBOX', true),
        ],
    ],

    /*
     * Payment Transaction Status
     */
    'transaction_status' => [
        'pending' => 'pending',
        'processing' => 'processing',
        'success' => 'success',
        'failed' => 'failed',
        'cancelled' => 'cancelled',
        'expired' => 'expired',
        'refunded' => 'refunded',
    ],

    /*
     * Payment Transaction Types
     */
    'transaction_types' => [
        'sale' => 'sale', // Initial payment
        'capture' => 'capture', // Capture authorized payment
        'refund' => 'refund', // Refund payment
        'partial_refund' => 'partial_refund', // Partial refund
    ],

    /*
     * Currency Configuration
     */
    'currency' => [
        'code' => env('PAYMENT_CURRENCY', 'BDT'),
        'symbol' => env('PAYMENT_CURRENCY_SYMBOL', '৳'),
        'position' => env('PAYMENT_CURRENCY_POSITION', 'prefix'), // prefix or suffix
    ],

    /*
     * Payment Verification Settings
     */
    'verification' => [
        'auto_verify' => env('AUTO_VERIFY_PAYMENTS', false),
        'verify_cron_interval' => env('PAYMENT_VERIFY_CRON_INTERVAL', 5), // minutes
        'pending_expiry_minutes' => env('PENDING_PAYMENT_EXPIRY_MINUTES', 30),
    ],

    /*
     * EMI Configuration
     */
    'emi' => [
        'enabled' => env('EMI_ENABLED', true),
        'min_amount' => env('EMI_MIN_AMOUNT', 5000),
        'banks' => [
            [
                'name' => 'Dutch Bangla Bank',
                'code' => 'DBBL',
                'tenures' => [3, 6, 9, 12, 18, 24, 36],
                'interest_rate' => 12.0,
            ],
            [
                'name' => 'City Bank',
                'code' => 'CITY',
                'tenures' => [3, 6, 9, 12, 18, 24, 36],
                'interest_rate' => 10.0,
            ],
            [
                'name' => 'Brac Bank',
                'code' => 'BRAC',
                'tenures' => [3, 6, 9, 12, 18, 24, 36],
                'interest_rate' => 11.0,
            ],
            [
                'name' => 'Eastern Bank',
                'code' => 'EBL',
                'tenures' => [3, 6, 9, 12, 18, 24, 36],
                'interest_rate' => 10.5,
            ],
        ],
    ],

    /*
     * Cash on Delivery (COD) Settings
     */
    'cod' => [
        'enabled' => env('COD_ENABLED', true),
        'max_amount' => env('COD_MAX_AMOUNT', 50000), // Maximum order amount for COD
        'additional_charge' => env('COD_ADDITIONAL_CHARGE', 0),
    ],

    /*
     * Security Settings
     */
    'security' => [
        'verify_ipn_signature' => env('VERIFY_IPN_SIGNATURE', true),
        'ipn_secret' => env('IPN_SECRET_KEY'),
        'allowed_ip_addresses' => explode(',', env('PAYMENT_IP_WHITELIST', '')),
    ],

];
