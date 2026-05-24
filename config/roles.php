<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Role Configuration
    |--------------------------------------------------------------------------
    |
    | This file contains role ID mappings and configuration for the application.
    | These values can be overridden in environment-specific configuration.
    |
    */

    /*
     * Customer Role IDs
     */
    'customer' => [
        'retail_id' => env('RETAIL_CUSTOMER_ROLE_ID', 10),
        'retail_slug' => env('RETAIL_CUSTOMER_ROLE_SLUG', 'retail_customer'),
        'wholesale_id' => env('WHOLESALE_CUSTOMER_ROLE_ID', 11),
        'wholesale_slug' => env('WHOLESALE_CUSTOMER_ROLE_SLUG', 'wholesale_customer'),
    ],

    /*
     * Staff Role IDs
     */
    'staff' => [
        'super_admin_id' => env('SUPER_ADMIN_ROLE_ID', 1),
        'super_admin_slug' => env('SUPER_ADMIN_ROLE_SLUG', 'super_admin'),
        'admin_id' => env('ADMIN_ROLE_ID', 2),
        'admin_slug' => env('ADMIN_ROLE_SLUG', 'admin'),
        'manager_id' => env('MANAGER_ROLE_ID', 3),
        'manager_slug' => env('MANAGER_ROLE_SLUG', 'manager'),
        'supervisor_id' => env('SUPERVISOR_ROLE_ID', 4),
        'supervisor_slug' => env('SUPERVISOR_ROLE_SLUG', 'supervisor'),
        'senior_staff_id' => env('SENIOR_STAFF_ROLE_ID', 5),
        'senior_staff_slug' => env('SENIOR_STAFF_ROLE_SLUG', 'senior_staff'),
        'seller_id' => env('SELLER_ROLE_ID', 6),
        'seller_slug' => env('SELLER_ROLE_SLUG', 'seller'),
        'store_keeper_id' => env('STORE_KEEPER_ROLE_ID', 7),
        'store_keeper_slug' => env('STORE_KEEPER_ROLE_SLUG', 'store_keeper'),
        'marketer_id' => env('MARKETER_ROLE_ID', 8),
        'marketer_slug' => env('MARKETER_ROLE_SLUG', 'marketer'),
    ],

    /*
     * Supplier Role IDs
     */
    'supplier' => [
        'supplier_id' => env('SUPPLIER_ROLE_ID', 9),
        'supplier_slug' => env('SUPPLIER_ROLE_SLUG', 'supplier'),
    ],

    /*
     * Protected Role IDs (Cannot be modified/deleted)
     */
    'protected' => [
        'ids' => [
            env('SUPER_ADMIN_ROLE_ID', 1),
            env('SUPPLIER_ROLE_ID', 9),
            env('RETAIL_CUSTOMER_ROLE_ID', 10),
            env('WHOLESALE_CUSTOMER_ROLE_ID', 11),
        ],
        'names' => [
            1 => 'Super Admin',
            9 => 'Supplier',
            10 => 'Retail Customer',
            11 => 'Wholesale Customer',
        ],
    ],

    /*
     * Role Display Names
     */
    'display_names' => [
        1 => 'Super Admin',
        2 => 'Admin',
        3 => 'Manager',
        4 => 'Supervisor',
        5 => 'Senior Staff',
        6 => 'Seller',
        7 => 'Store Keeper',
        8 => 'Marketer',
        9 => 'Supplier',
        10 => 'Retail Customer',
        11 => 'Wholesale Customer',
    ],

];
