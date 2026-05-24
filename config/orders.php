<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Order Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains order status definitions and configuration for the application.
    |
    */

    /*
     * Order Status Definitions
     */
    'status' => [
        'pending' => 'pending',
        'confirmed' => 'confirmed',
        'processing' => 'processing',
        'ready_to_ship' => 'ready_to_ship',
        'shipped' => 'shipped',
        'delivered' => 'delivered',
        'cancelled' => 'cancelled',
        'refunded' => 'refunded',
        'failed' => 'failed',
    ],

    /*
     * Payment Status Definitions
     */
    'payment_status' => [
        'unpaid' => 'unpaid',
        'partial' => 'partial',
        'paid' => 'paid',
        'refunded' => 'refunded',
        'failed' => 'failed',
    ],

    /*
     * Order Channels (Sales Channels)
     */
    'channels' => [
        'retail_web' => 'retail_web',
        'wholesale_web' => 'wholesale_web',
        'pos' => 'pos',
        'mobile_app' => 'mobile_app',
        'phone_order' => 'phone_order',
        'social_commerce' => 'social_commerce',
    ],

    /*
     * Payment Methods
     */
    'payment_methods' => [
        'cod' => 'cod', // Cash on Delivery
        'sslcommerz' => 'sslcommerz',
        'eps' => 'eps',
        'bkash' => 'bkash',
        'nagad' => 'nagad',
        'rocket' => 'rocket',
        'bank_transfer' => 'bank_transfer',
        'check' => 'check',
    ],

    /*
     * Invoice Number Prefixes by Channel
     */
    'invoice_prefixes' => [
        'retail_web' => 'WEB',
        'wholesale_web' => 'WS',
        'pos' => 'POS',
        'mobile_app' => 'APP',
        'phone_order' => 'PHONE',
        'social_commerce' => 'SOCIAL',
    ],

    /*
     * Order Status Workflow (Valid status transitions)
     * Key = Current Status, Value = Allowed Next Statuses
     */
    'workflow' => [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['processing', 'cancelled'],
        'processing' => ['ready_to_ship', 'cancelled'],
        'ready_to_ship' => ['shipped', 'cancelled'],
        'shipped' => ['delivered', 'cancelled'],
        'delivered' => ['refunded'],
        'cancelled' => [], // Terminal state
        'refunded' => [], // Terminal state
        'failed' => ['pending', 'cancelled'], // Can retry failed payments
    ],

    /*
     * Cancellable Statuses (Orders that can be cancelled)
     */
    'cancellable_statuses' => [
        'pending',
        'confirmed',
        'processing',
        'ready_to_ship',
    ],

    /*
     * Refundable Statuses
     */
    'refundable_statuses' => [
        'delivered',
    ],

    /*
     * Default Status for New Orders
     */
    'default_status' => 'pending',

    /*
     * Default Payment Status for New Orders
     */
    'default_payment_status' => 'unpaid',

    /*
     * Paid Payment Methods (These set payment_status to 'paid' immediately)
     */
    'paid_payment_methods' => [
        'bkash',
        'nagad',
        'rocket',
        'bank_transfer',
    ],

    /*
     * Unpaid Payment Methods (These require payment verification)
     */
    'unpaid_payment_methods' => [
        'cod',
        'sslcommerz',
        'eps',
    ],

    /*
     * Maximum Items Per Order
     */
    'max_items_per_order' => env('MAX_ITEMS_PER_ORDER', 100),

    /*
     * Maximum Quantity Per Item
     */
    'max_quantity_per_item' => env('MAX_QUANTITY_PER_ITEM', 1000),

    /*
     * Minimum Order Amount
     */
    'min_order_amount' => env('MIN_ORDER_AMOUNT', 0),

    /*
     * Maximum Order Amount
     */
    'max_order_amount' => env('MAX_ORDER_AMOUNT', 99999999.99),

];
