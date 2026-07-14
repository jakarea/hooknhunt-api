<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes - HookNHunt Fishing Platform
|--------------------------------------------------------------------------
|
| Complete API routing specification organized by functional category.
| All routes are prefixed with /api by default (see config/api.php).
|
| ROUTE CATEGORIES:
| 1. Auth Routes (login, register, logout, password reset)
| 2. Product Routes (products, categories, search, special offers)
| 3. Order Routes (checkout, order management, order summary)
| 4. Payment Routes (payment initiation, callbacks, status checks)
| 5. Review Routes (product reviews management)
| 6. Coupon Routes (coupon validation and auto-apply)
| 7. Affiliate Routes (affiliate management and earning)
| 8. User Routes (profile and address management)
| 9. Admin Routes (website management, user management)
|
|--------------------------------------------------------------------------
*/

// ====================================================
// LAZYHAT INTEGRATION ROUTES (Third-party API)
// ====================================================

Route::group([
    'middleware' => ['lazychat.auth'],
], function () {
    // Step 1: Initial inventory sync - LazyChat fetches all products
    Route::get('/products', 'App\Http\Controllers\Api\V2\LazychatRetailController@products');

    // Get single product by ID (optional - for testing/debugging)
    Route::get('/products/{id}', 'App\Http\Controllers\Api\V2\LazychatRetailController@showProduct');

    // Step 3: Order creation - LazyChat AI posts orders
    Route::post('/order/create', 'App\Http\Controllers\Api\V2\LazychatRetailController@receiveOrder');
});

// ====================================================
// V2 API ROUTES (Main API)
// ====================================================

Route::group(['prefix' => 'v2'], function () {

    // ====================================================
    // 1. AUTH ROUTES
    // ====================================================
    Route::group(['prefix' => 'auth'], function () {
        // Public Auth Endpoints (rate limited)
        Route::post('login', 'App\Http\Controllers\Api\V2\AuthController@login')
            ->middleware('throttle:5,1')
            ->name('auth.login');

        Route::post('register', 'App\Http\Controllers\Api\V2\AuthController@register')
            ->middleware('throttle:5,1')
            ->name('auth.register');

        Route::post('verify-otp', 'App\Http\Controllers\Api\V2\AuthController@verifyOtp')
            ->middleware('throttle:5,1')
            ->name('auth.verify-otp');

        Route::post('resend-otp', 'App\Http\Controllers\Api\V2\AuthController@resendOtp')
            ->middleware('throttle:1,1')
            ->name('auth.resend-otp');

        Route::post('send-reset-otp', 'App\Http\Controllers\Api\V2\AuthController@sendResetOtp')
            ->middleware('throttle:5,1')
            ->name('auth.send-reset-otp');

        Route::post('reset-password', 'App\Http\Controllers\Api\V2\AuthController@resetPassword')
            ->middleware('throttle:5,1')
            ->name('auth.reset-password');

        // Protected Auth Endpoints (requires authentication)
        Route::middleware(['auth'])->group(function () {
            Route::get('me', 'App\Http\Controllers\Api\V2\AuthController@profile')
                ->name('auth.profile');

            Route::post('logout', 'App\Http\Controllers\Api\V2\AuthController@logout')
                ->name('auth.logout');

            Route::put('profile', 'App\Http\Controllers\Api\V2\AuthController@updateProfile')
                ->name('auth.update-profile');

            Route::put('change-password', 'App\Http\Controllers\Api\V2\AuthController@changePassword')
                ->name('auth.change-password');
        });
    });

    // ====================================================
    // 2. PRODUCT ROUTES
    // ====================================================
    Route::group(['prefix' => 'products'], function () {
        // Public Product Endpoints
        Route::get('/', 'App\Http\Controllers\Api\V2\PublicController@productList')
            ->name('products.list');

        Route::get('{slug}', 'App\Http\Controllers\Api\V2\PublicController@productDetail')
            ->name('products.show');

        Route::get('search', 'App\Modules\Website\Http\Controllers\Api\V2\Website\ProductController@search')
            ->name('products.search');

        Route::get('search/suggestions', 'App\Modules\Website\Http\Controllers\Api\V2\Website\ProductController@searchSuggestions')
            ->name('products.search-suggestions');
    });

    // Categories
    Route::get('categories', 'App\Http\Controllers\Api\V2\PublicController@categories')
        ->name('categories.list');

    // Special Offers Routes
    Route::group(['prefix' => 'offers'], function () {
        Route::get('sliders', 'App\Http\Controllers\Api\V2\PublicController@sliders')
            ->name('offers.sliders');

        Route::get('hot-deals', 'App\Http\Controllers\Api\V2\PublicController@hotDeals')
            ->name('offers.hot-deals');
    });

    // ====================================================
    // 3. ORDER ROUTES
    // ====================================================
    Route::group(['prefix' => 'store/orders'], function () {
        // Public Order Endpoints (Guest Checkout)
        Route::post('/', 'App\Modules\Website\Http\Controllers\Api\V2\Website\OrderController@placeOrder')
            ->name('orders.create');

        Route::get('{id}', 'App\Modules\Website\Http\Controllers\Api\V2\Website\OrderController@getById')
            ->name('orders.show');

        Route::post('verify', 'App\Modules\Website\Http\Controllers\Api\V2\Website\OrderController@verifyOrder')
            ->name('orders.verify');

        // Protected Order Endpoints (Authenticated Users)
        Route::middleware(['auth'])->group(function () {
            Route::get('/', 'App\Modules\Website\Http\Controllers\Api\V2\Website\OrderController@listUserOrders')
                ->name('orders.list');

            Route::post('summary', 'App\Modules\Website\Http\Controllers\Api\V2\Website\OrderController@getOrderSummary')
                ->name('orders.summary');
        });
    });

    // Checkout Endpoint
    Route::post('checkout', 'App\Modules\Website\Http\Controllers\Api\V2\Website\CheckoutController@initiateCheckout')
        ->name('checkout.initiate');

    // ====================================================
    // 4. PAYMENT ROUTES
    // ====================================================
    Route::group(['prefix' => 'store/payments'], function () {
        // Public Payment Endpoints
        Route::get('gateway', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@getActiveGateway')
            ->name('payment.gateway');

        Route::post('initiate', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@initiatePayment')
            ->name('payment.initiate');

        Route::post('initiate-eps', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@initiateEPS')
            ->name('payment.initiate-eps');

        Route::post('initiate-ssl', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@initiateSSL')
            ->name('payment.initiate-ssl');

        Route::post('emi-options', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@emiOptions')
            ->name('payment.emi-options');

        Route::post('callback', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@verifyCallback')
            ->name('payment.callback');

        Route::get('status/{tran_id}', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@getPaymentStatus')
            ->name('payment.status');

        // Payment Links
        Route::get('links/validate/{token}', 'App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController@validatePaymentLink')
            ->name('payment.validate-link');
    });

    // ====================================================
    // 5. REVIEW ROUTES
    // ====================================================
    Route::group(['prefix' => 'reviews'], function () {
        // Public Review Endpoints
        Route::get('/', 'App\Http\Controllers\Api\V2\ReviewController@index')
            ->name('reviews.list');

        Route::get('{id}', 'App\Http\Controllers\Api\V2\ReviewController@show')
            ->name('reviews.show');

        Route::get('product/{productId}', 'App\Http\Controllers\Api\V2\ReviewController@byProduct')
            ->name('reviews.by-product');

        // Protected Review Endpoints (Authenticated Users)
        Route::middleware(['auth'])->group(function () {
            Route::post('/', 'App\Http\Controllers\Api\V2\ReviewController@store')
                ->name('reviews.create');

            Route::put('{id}', 'App\Http\Controllers\Api\V2\ReviewController@update')
                ->name('reviews.update');

            Route::delete('{id}', 'App\Http\Controllers\Api\V2\ReviewController@destroy')
                ->name('reviews.delete');
        });
    });

    // ====================================================
    // 6. COUPON ROUTES
    // ====================================================
    Route::group(['prefix' => 'store/coupons'], function () {
        // Public Coupon Endpoints
        Route::post('validate', 'App\Modules\Website\Http\Controllers\Api\V2\Website\CouponController@checkCoupon')
            ->name('coupons.validate');

        Route::get('auto-apply', 'App\Modules\Website\Http\Controllers\Api\V2\Website\CouponController@autoApply')
            ->name('coupons.auto-apply');
    });

    // ====================================================
    // 7. AFFILIATE ROUTES
    // ====================================================
    // These routes are loaded from the Affiliate module
    // See: Modules/Affiliate/routes/api.php

    // ====================================================
    // 8. USER ROUTES
    // ====================================================
    Route::group(['prefix' => 'user', 'middleware' => ['auth']], function () {
        // Profile Management
        Route::get('profile', 'App\Http\Controllers\Api\V2\UserController@profile')
            ->name('user.profile');

        Route::put('profile', 'App\Http\Controllers\Api\V2\UserController@updateProfile')
            ->name('user.update-profile');

        // Address Management
        Route::group(['prefix' => 'addresses'], function () {
            Route::get('/', 'App\Http\Controllers\Api\V2\AddressController@list')
                ->name('addresses.list');

            Route::post('/', 'App\Http\Controllers\Api\V2\AddressController@store')
                ->name('addresses.create');

            Route::get('{id}', 'App\Http\Controllers\Api\V2\AddressController@show')
                ->name('addresses.show');

            Route::put('{id}', 'App\Http\Controllers\Api\V2\AddressController@update')
                ->name('addresses.update');

            Route::delete('{id}', 'App\Http\Controllers\Api\V2\AddressController@destroy')
                ->name('addresses.delete');

            Route::post('{id}/set-default', 'App\Http\Controllers\Api\V2\AddressController@setDefault')
                ->name('addresses.set-default');
        });

        // Wishlist Management
        Route::group(['prefix' => 'wishlist'], function () {
            Route::get('/', 'App\Http\Controllers\Api\V2\WishlistController@list')
                ->name('wishlist.list');

            Route::post('{productId}', 'App\Http\Controllers\Api\V2\WishlistController@add')
                ->name('wishlist.add');

            Route::delete('{productId}', 'App\Http\Controllers\Api\V2\WishlistController@remove')
                ->name('wishlist.remove');
        });
    });

    // ====================================================
    // 9. ADMIN ROUTES (Website Management)
    // ====================================================
    Route::middleware(['auth'])->group(function () {
        // Product Management (Admin)
        Route::group(['prefix' => 'website-admin/products', 'middleware' => 'permission:website.products.manage'], function () {
            Route::get('search', 'App\Http\Controllers\Api\V2\WebsiteAdmin\OrderController@searchProducts')
                ->middleware('permission:website.orders.products.search')
                ->name('admin.products.search');

            Route::get('search-products', 'App\Http\Controllers\Api\V2\WebsiteAdmin\OrderController@searchProductsGrouped')
                ->middleware('permission:website.orders.products.search')
                ->name('admin.products.search-grouped');

            Route::get('top-selling', 'App\Http\Controllers\Api\V2\WebsiteAdmin\OrderController@topSellingProducts')
                ->name('admin.products.top-selling');
        });

        // Order Management (Admin)
        Route::group(['prefix' => 'admin/orders'], function () {
            Route::post('{id}/generate-payment-link', 'App\Modules\Admin\Http\Controllers\AdminPaymentLinkController@generate')
                ->middleware('permission:admin.orders.manage')
                ->name('admin.orders.generate-payment-link');

            Route::get('{id}/payment-links', 'App\Modules\Admin\Http\Controllers\AdminPaymentLinkController@getOrderLinks')
                ->middleware('permission:admin.orders.view')
                ->name('admin.orders.payment-links');
        });

        // System Settings (Admin)
        Route::group(['prefix' => 'system/settings'], function () {
            Route::get('payment', 'App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController@index')
                ->name('admin.settings.payment');

            Route::put('payment/gateway', 'App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController@updateGateway')
                ->middleware('permission:admin.settings.payment.manage')
                ->name('admin.settings.payment.update');

            Route::post('payment/eps/test', 'App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController@testEPS')
                ->middleware('permission:admin.settings.payment.test')
                ->name('admin.settings.payment.test-eps');
        });

        // HRM Routes (HR Management)
        Route::group(['prefix' => 'hrm'], function () {
            // Attendance Management
            Route::get('attendance/my-status', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@myStatus')
                ->name('hrm.attendance.my-status');

            Route::post('clock-in', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@clockIn')
                ->middleware('permission:hrm.attendance.clock-in')
                ->name('hrm.clock-in');

            Route::post('clock-out', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@clockOut')
                ->middleware('permission:hrm.attendance.clock-out')
                ->name('hrm.clock-out');

            Route::post('break-in', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@breakIn')
                ->middleware('permission:hrm.attendance.break-in')
                ->name('hrm.break-in');

            Route::post('break-out', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController@breakOut')
                ->middleware('permission:hrm.attendance.break-out')
                ->name('hrm.break-out');

            // Staff Management
            Route::get('staff', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController@index')
                ->middleware('permission:hrm.staff.index')
                ->name('hrm.staff.list');

            Route::post('staff/{id}/change-password', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController@changePassword')
                ->middleware('permission:hrm.staff.change-password')
                ->name('hrm.staff.change-password');

            Route::post('staff/{id}/send-password-sms', 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController@sendPasswordSms')
                ->middleware('permission:hrm.staff.send-password-sms')
                ->name('hrm.staff.send-password-sms');
        });

        // User Management (Admin)
        Route::group(['prefix' => 'user-management', 'middleware' => 'permission:user-management.users.index'], function () {
            Route::get('users', 'App\Http\Controllers\Api\V2\UserController@index')
                ->name('admin.users.list');

            Route::post('users', 'App\Http\Controllers\Api\V2\UserController@store')
                ->middleware('permission:user-management.users.create')
                ->name('admin.users.create');

            Route::get('users/{id}', 'App\Http\Controllers\Api\V2\UserController@show')
                ->name('admin.users.show');

            Route::put('users/{id}', 'App\Http\Controllers\Api\V2\UserController@update')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.update');

            Route::delete('users/{id}', 'App\Http\Controllers\Api\V2\UserController@destroy')
                ->middleware('permission:user-management.users.delete')
                ->name('admin.users.delete');

            Route::post('users/{id}/ban', 'App\Http\Controllers\Api\V2\UserController@banUser')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.ban');

            Route::post('users/{id}/restore', 'App\Http\Controllers\Api\V2\UserController@restore')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.restore');

            Route::post('users/{id}/direct-permissions', 'App\Http\Controllers\Api\V2\UserController@giveDirectPermission')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.direct-permissions');

            Route::post('users/{id}/block-permission', 'App\Http\Controllers\Api\V2\UserController@blockPermission')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.block-permission');

            Route::put('users/{id}/permissions/granted', 'App\Http\Controllers\Api\V2\UserController@syncGrantedPermissions')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.sync-granted-permissions');

            Route::put('users/{id}/permissions/blocked', 'App\Http\Controllers\Api\V2\UserController@syncBlockedPermissions')
                ->middleware('permission:user-management.users.edit')
                ->name('admin.users.sync-blocked-permissions');

            Route::get('roles', 'App\Http\Controllers\Api\V2\UserController@roleList')
                ->name('admin.roles.list');

            Route::get('permissions', 'App\Http\Controllers\Api\V2\PermissionController@list')
                ->name('admin.permissions.list');
        });
    });
});

// ====================================================
// MODULE ROUTES (Loaded Conditionally)
// ====================================================

// Load CRM module routes
if (file_exists(base_path('Modules/CRM/routes/api.php'))) {
    require base_path('Modules/CRM/routes/api.php');
}

// Load Affiliate module routes
if (file_exists(base_path('Modules/Affiliate/routes/api.php'))) {
    require base_path('Modules/Affiliate/routes/api.php');
}
