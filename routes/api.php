<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| LazyChat Integration API Routes (Notion Compliant)
|--------------------------------------------------------------------------
|
| These routes follow the Notion documentation specification exactly:
| - GET /api/products - Initial inventory sync
| - POST /api/order/create - Order creation from LazyChat AI
|
| All routes require Bearer token authentication (LAZYCHAT_API_TOKEN)
|
| Controller: App\Http\Controllers\Api\V2\LazychatRetailController
|
*/

Route::group([
    'middleware' => ['lazychat.auth'],
], function () {
    // Step 1: Initial inventory sync
    // LazyChat fetches all products from this endpoint
    // GET /api/products
    Route::get('/products', 'App\Http\Controllers\Api\V2\LazychatRetailController@products');

    // Get single product by ID (optional - for testing/debugging)
    // GET /api/products/{id}
    Route::get('/products/{id}', 'App\Http\Controllers\Api\V2\LazychatRetailController@showProduct');

    // Step 3: Order creation
    // LazyChat AI posts orders to this endpoint
    // POST /api/order/create
    Route::post('/order/create', 'App\Http\Controllers\Api\V2\LazychatRetailController@receiveOrder');
});

// ====================================================
// V2 API Routes
// ====================================================
Route::group([
    'prefix' => 'v2',
], function () {
    // --- Public Auth Routes ---
    Route::post('auth/login', 'App\Http\Controllers\Api\V2\AuthController@login')->middleware('throttle:5,1');
    Route::post('auth/register', 'App\Http\Controllers\Api\V2\AuthController@register')->middleware('throttle:5,1');
    Route::post('auth/verify-otp', 'App\Http\Controllers\Api\V2\AuthController@verifyOtp')->middleware('throttle:5,1');
    Route::post('auth/resend-otp', 'App\Http\Controllers\Api\V2\AuthController@resendOtp')->middleware('throttle:1,1');
    Route::post('auth/send-reset-otp', 'App\Http\Controllers\Api\V2\AuthController@sendResetOtp')->middleware('throttle:5,1');
    Route::post('auth/reset-password', 'App\Http\Controllers\Api\V2\AuthController@resetPassword')->middleware('throttle:5,1');

    // --- Protected Routes (require authentication) ---
    Route::middleware(['auth'])->group(function () {
        // Profile & Auth routes
        Route::get('auth/me', 'App\Http\Controllers\Api\V2\AuthController@profile');
        Route::post('auth/logout', 'App\Http\Controllers\Api\V2\AuthController@logout');
        Route::put('auth/profile', 'App\Http\Controllers\Api\V2\AuthController@updateProfile');
        Route::put('auth/change-password', 'App\Http\Controllers\Api\V2\AuthController@changePassword');
    });

    // --- Public Routes ---
    Route::get('public/products', 'App\Http\Controllers\Api\V2\PublicController@productList');
    Route::get('public/products/{slug}', 'App\Http\Controllers\Api\V2\PublicController@productDetail');
    Route::get('public/categories', 'App\Http\Controllers\Api\V2\PublicController@categories');

    // --- System Settings Routes (Payment & General Settings) ---
    Route::get('system/settings/payment', 'App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController@index');

    // --- Authenticated System Settings Routes ---
    Route::middleware(['auth'])->group(function () {
        // Payment Settings Management
        Route::put('system/settings/payment/gateway', 'App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController@updateGateway');
        Route::post('system/settings/payment/eps/test', 'App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController@testEPS');
    });

    // --- HRM Routes (Attendance & Staff) ---
    Route::middleware(['auth'])->group(function () {
        // Attendance Management (authenticated users)
        Route::get('hrm/attendance/my-status', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@myStatus');
        Route::post('hrm/clock-in', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@clockIn')->middleware('permission:hrm.attendance.clock-in');
        Route::post('hrm/clock-out', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@clockOut')->middleware('permission:hrm.attendance.clock-out');
        Route::post('hrm/break-in', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@breakIn')->middleware('permission:hrm.attendance.break-in');
        Route::post('hrm/break-out', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@breakOut')->middleware('permission:hrm.attendance.break-out');

        // Staff Management (authenticated users)
        Route::get('hrm/staff', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController@index')->middleware('permission:hrm.staff.index');
        Route::post('hrm/staff/{id}/change-password', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController@changePassword')->middleware('permission:hrm.staff.change-password');
        Route::post('hrm/staff/{id}/send-password-sms', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController@sendPasswordSms')->middleware('permission:hrm.staff.send-password-sms');
    });

    // --- Website Admin Routes (Storefront Management) ---
    Route::middleware(['auth'])->group(function () {
        // Product Search (for adding items to reviews/orders)
        Route::get('website-admin/products/search', 'App\Http\Controllers\Api\V2\WebsiteAdmin\OrderController@searchProducts')->middleware('permission:website.orders.products.search');
        Route::get('website-admin/products/search-products', 'App\Http\Controllers\Api\V2\WebsiteAdmin\OrderController@searchProductsGrouped')->middleware('permission:website.orders.products.search');
        Route::get('website-admin/products/top-selling', 'App\Http\Controllers\Api\V2\WebsiteAdmin\OrderController@topSellingProducts');
    });
});

// Load CRM module routes
if (file_exists(base_path('Modules/CRM/Routes/api.php'))) {
    require base_path('Modules/CRM/Routes/api.php');
}

// Load Affiliate module routes
if (file_exists(base_path('Modules/Affiliate/routes/api.php'))) {
    require base_path('Modules/Affiliate/routes/api.php');
}
