<?php

// EPS Payment configuration

// Get the mode from .env (sandbox or live)
$mode = env('EPS_MODE', 'sandbox');

return [
    // Current mode
    'mode' => $mode,

    // Base URL for API calls - determined by EPS_MODE
    'EPSBaseURL' => $mode === 'sandbox'
        ? env('EPS_BASE_URL_SANDBOX', 'https://sandboxpgapi.eps.com.bd')
        : env('EPS_BASE_URL_LIVE', 'https://pgapi.eps.com.bd'),

    // API endpoints
    'apiUrl' => [
        'SignIn' => "/v1/SignIn",
        'GetToken' => "/v1/Auth/GetToken",
        'Initialize' => "/v1/EPSEngine/InitializeEPS",
        'CheckPaymentStatus' => "/v1/EPSEngine/CheckMerchantTransactionStatus?merchantTransactionId="
    ],

    // Sandbox credentials (used when EPS_MODE=sandbox)
    'sandbox' => [
        'store_username' => env("EPS_STORE_USERNAME_SANDBOX"),
        'store_password' => env("EPS_STORE_PASSWORD_SANDBOX"),
        'device_type_id' => env("EPS_STORE_DEVICE_TYPE_SANDBOX"),
        'hash_key' => env("EPS_HASH_KEY_SANDBOX"),
        'merchant_id' => env("EPS_MERCHANT_ID_SANDBOX"),
        'store_id' => env("EPS_STORE_ID_SANDBOX"),
    ],

    // Live credentials (used when EPS_MODE=live)
    'live' => [
        'store_username' => env("EPS_STORE_USERNAME_LIVE"),
        'store_password' => env("EPS_STORE_PASSWORD_LIVE"),
        'device_type_id' => env("EPS_STORE_DEVICE_TYPE_LIVE"),
        'hash_key' => env("EPS_HASH_KEY_LIVE"),
        'merchant_id' => env("EPS_MERCHANT_ID_LIVE"),
        'store_id' => env("EPS_STORE_ID_LIVE"),
    ],

    // Callback URLs (for reference, actual URLs set in routes)
    'callbacks' => [
        'success' => env('EPS_SUCCESS_URL'),
        'fail' => env('EPS_FAIL_URL'),
        'cancel' => env('EPS_CANCEL_URL'),
        'ipn' => env('EPS_IPN_URL'),
    ],

    // Settings
    'timeout' => env('EPS_TIMEOUT', 30),
];
