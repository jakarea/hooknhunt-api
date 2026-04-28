<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Lazychat Integration Configuration
    |--------------------------------------------------------------------------
    |
    | Configuration for Lazychat retail platform integration.
    | Handles webhooks for product synchronization.
    |
    */

    // Enable/disable Lazychat integration
    'enabled' => env('LAZYCHAT_ENABLED', true),

    // Webhook endpoints and authentication
    'webhooks' => [
        // Product create and update endpoint
        'create_update_url' => env('LAZYCHAT_WEBHOOK_CREATE_URL', 'https://flow.lazychat.io/api/exec/flows/69e9bc9f7fd64cf4ca2f9a71/WRkTno7aJAHU'),
        'create_update_token' => env('LAZYCHAT_WEBHOOK_CREATE_TOKEN', 'c2bcecd19a7d0afca4cd4b46aca8ecc194df4de693c0bd1699edd1ccfcbea62b'),

        // Product delete endpoint (different from create/update)
        'delete_url' => env('LAZYCHAT_WEBHOOK_DELETE_URL', 'https://flow.lazychat.io/api/exec/flows/69e9bc9f7fd64cf4ca2f9a71/Hj2A7QqT1K0N'),
        'delete_token' => env('LAZYCHAT_WEBHOOK_DELETE_TOKEN', 'bfd4dcab6657d9a6d296efe3599e624bec424fc1dbd2df471710e717ef828e6f'),
    ],

    // Queue configuration for async webhook processing
    'queue' => [
        'connection' => env('LAZYCHAT_QUEUE_CONNECTION', 'database'),
        'queue' => env('LAZYCHAT_QUEUE_NAME', 'lazychat-webhooks'),
    ],

    // Retry configuration
    'retry' => [
        'max_attempts' => env('LAZYCHAT_MAX_RETRIES', 3),
        'delay_seconds' => env('LAZYCHAT_RETRY_DELAY', 30),
        'timeout_seconds' => env('LAZYCHAT_TIMEOUT', 10),
    ],

    // Notification settings
    'notification' => [
        // Admin notification email for webhook failures
        'email' => env('LAZYCHAT_ADMIN_EMAIL', 'admin@hooknhunt.com'),
        'notify_on_failure' => env('LAZYCHAT_NOTIFY_ON_FAILURE', true),
    ],

    // Webhook log retention (days)
    'log_retention_days' => env('LAZYCHAT_LOG_RETENTION_DAYS', 30),
];
