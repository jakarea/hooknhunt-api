<?php

return [
    /*
    |--------------------------------------------------------------------------
    | SSL Commerz Mode
    |--------------------------------------------------------------------------
    |
    | Environment: sandbox or live
    |
    */
    'mode' => env('SSLCOMMERZ_MODE', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | Sandbox Credentials
    |--------------------------------------------------------------------------
    |
    | SSL Commerz sandbox store credentials for testing
    |
    */
    'sandbox' => [
        'store_id' => env('SSLCOMMERZ_STORE_ID_SANDBOX'),
        'store_password' => env('SSLCOMMERZ_STORE_PASSWORD_SANDBOX'),
        'base_url' => 'https://securepay.sslcommerz.com',
    ],

    /*
    |--------------------------------------------------------------------------
    | Live Credentials
    |--------------------------------------------------------------------------
    |
    | SSL Commerz live store credentials for production
    |
    */
    'live' => [
        'store_id' => env('SSLCOMMERZ_STORE_ID_LIVE'),
        'store_password' => env('SSLCOMMERZ_STORE_PASSWORD_LIVE'),
        'base_url' => 'https://securepay.sslcommerz.com',
    ],

    /*
    |--------------------------------------------------------------------------
    | Callback URLs
    |--------------------------------------------------------------------------
    |
    | URLs where SSL Commerz will redirect after payment
    |
    */
    'success_url' => env('SSLCOMMERZ_SUCCESS_URL'),
    'fail_url' => env('SSLCOMMERZ_FAIL_URL'),
    'cancel_url' => env('SSLCOMMERZ_CANCEL_URL'),
    'ipn_url' => env('SSLCOMMERZ_IPN_URL'),

    /*
    |--------------------------------------------------------------------------
    | EMI Banks (Bangladesh)
    |--------------------------------------------------------------------------
    |
    | Available banks for EMI (0 = all banks, 1-13 = specific banks)
    |
    */
    'emi_banks' => [
        0 => 'All Banks',
        1 => 'DBBL (Dutch Bangla Bank)',
        2 => 'BRAC Bank',
        3 => 'City Bank',
        4 => 'Prime Bank',
        5 => 'IBBL (Islami Bank)',
        6 => 'Standard Chartered',
        7 => 'Uttara Bank',
        8 => 'Eastern Bank',
        9 => 'United Commercial Bank',
        10 => 'Jamuna Bank',
        11 => 'Meghna Bank',
        12 => 'Southeast Bank',
        13 => 'Bank Asia',
    ],

    /*
    |--------------------------------------------------------------------------
    | EMI Settings
    |--------------------------------------------------------------------------
    |
    | EMI options configuration
    |
    */
    'emi' => [
        'enabled' => true,
        'min_amount' => env('SSLCOMMERZ_EMI_MIN_AMOUNT', 1000), // Minimum amount for EMI in BDT
        'tenures' => [3, 6, 9, 12, 18, 24], // Available EMI tenures in months
    ],

    /*
    |--------------------------------------------------------------------------
    | Verification Settings
    |--------------------------------------------------------------------------
    |
    | Pending payment verification settings
    |
    */
    'verification' => [
        'enabled' => true,
        'secret_key' => env('PAYMENT_VERIFY_CRON_SECRET'),
        'check_minutes' => (int) env('PAYMENT_VERIFY_CRON_MINUTES', 15), // Check payments older than X minutes
        'max_attempts' => 5, // Max verification attempts before marking as failed
    ],

    /*
    |--------------------------------------------------------------------------
    | Connection Timeout
    |--------------------------------------------------------------------------
    |
    | Timeout for SSL Commerz API calls in seconds
    |
    */
    'timeout' => 30,
];
