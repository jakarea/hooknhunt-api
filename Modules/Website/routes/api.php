<?php

use App\Modules\Website\Http\Controllers\Api\V2\Website\AccountController;
use App\Modules\Website\Http\Controllers\Api\V2\Website\OrderController;
use App\Modules\Website\Http\Controllers\Api\V2\Website\ProductController;
use App\Modules\Website\Http\Controllers\Api\V2\Website\ReviewController;
use App\Modules\Website\Http\Controllers\Api\V2\Website\StorefrontSliderController;
use App\Modules\Website\Http\Controllers\Api\V2\Website\PaymentGatewayController;
use App\Modules\Website\Http\Controllers\Api\V2\Website\SteadfastWebhookController;
use App\Modules\Website\Http\Controllers\Api\V2\CategoryController;
use App\Modules\Website\Http\Controllers\Api\V2\CouponController;
use App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin\OrderController as WebsiteAdminOrderController;
use App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin\SliderController;
use App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin\DeliverySettingController;
use App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin\SettingController;
use App\Modules\Website\Http\Controllers\Api\V2\WebsiteAdmin\LeadController as WebsiteAdminLeadController;
use App\Http\Controllers\Api\V2\AuthController;
use App\Http\Controllers\Api\V2\PublicController;
use App\Http\Controllers\Api\V2\SystemController;
use Illuminate\Support\Facades\Route;

// WEBSITE API (For Next.js Website)
// This file contains all routes for the public website

// Auth routes alias - for backward compatibility
Route::prefix('api/v2/auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/send-otp', [AuthController::class, 'resendOtp']);
    Route::post('/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/send-reset-otp', [AuthController::class, 'sendResetOtp']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::prefix('api/v2/website-admin')->group(function () {
    // Admin settings routes
    Route::get('/settings', [SystemController::class, 'getSettings']);
    Route::put('/settings', [SettingController::class, 'update']);

    // Admin delivery settings routes
    Route::get('/delivery-settings', [DeliverySettingController::class, 'index']);
    Route::put('/delivery-settings', [DeliverySettingController::class, 'update']);
    Route::post('/delivery-settings/calculate', [DeliverySettingController::class, 'calculate']);

    // Admin slider management routes
    Route::get('/sliders', [SliderController::class, 'index']);
    Route::post('/sliders', [SliderController::class, 'store']);
    Route::get('/sliders/{id}', [SliderController::class, 'show']);
    Route::put('/sliders/{id}', [SliderController::class, 'update']);
    Route::delete('/sliders/{id}', [SliderController::class, 'destroy']);
    Route::post('/sliders/reorder', [SliderController::class, 'reorder']);
    Route::put('/sliders/{id}/toggle-status', [SliderController::class, 'toggleStatus']);

    // Admin review management routes
    Route::get('/reviews', [ReviewController::class, 'adminIndex']);
    Route::post('/reviews', [ReviewController::class, 'adminStore']);
    Route::put('/reviews/{id}', [ReviewController::class, 'adminUpdate']);
    Route::delete('/reviews/{id}', [ReviewController::class, 'adminDestroy']);
    Route::put('/reviews/{id}/toggle-featured', [ReviewController::class, 'toggleFeatured']);
    Route::post('/reviews/sort-order', [ReviewController::class, 'updateSortOrder']);

    // Admin order management routes
    Route::get('/orders', [WebsiteAdminOrderController::class, 'index']);
    Route::get('/orders/statistics', [WebsiteAdminOrderController::class, 'statistics']);
    Route::get('/orders/{id}', [WebsiteAdminOrderController::class, 'show']);
    Route::put('/orders/{id}', [WebsiteAdminOrderController::class, 'update']);
    Route::put('/orders/{id}/status', [WebsiteAdminOrderController::class, 'updateStatus']);
    Route::put('/orders/{id}/payment', [WebsiteAdminOrderController::class, 'updatePayment']);
    Route::post('/orders/{id}/items', [WebsiteAdminOrderController::class, 'addItem']);
    Route::put('/orders/{id}/items/{itemId}', [WebsiteAdminOrderController::class, 'updateItem']);
    Route::delete('/orders/{id}/items/{itemId}', [WebsiteAdminOrderController::class, 'removeItem']);
    Route::post('/orders/{id}/send-to-courier', [WebsiteAdminOrderController::class, 'sendToCourier']);
    Route::post('/orders/{id}/sync-courier', [WebsiteAdminOrderController::class, 'syncCourierStatus']);
    Route::post('/orders/{id}/send-sms', [WebsiteAdminOrderController::class, 'sendSms']);
    Route::post('/orders/bulk-update-status', [WebsiteAdminOrderController::class, 'bulkUpdateStatus']);
    Route::post('/orders/bulk-send-to-courier', [WebsiteAdminOrderController::class, 'bulkSendToCourier']);
    Route::delete('/orders/{id}', [WebsiteAdminOrderController::class, 'destroy']);

    // Product search and variants for order management
    Route::get('/products/search', [WebsiteAdminOrderController::class, 'searchProducts']);
    Route::post('/products/search', [WebsiteAdminOrderController::class, 'searchProducts']);
    Route::get('/products/{id}/variants', [WebsiteAdminOrderController::class, 'productVariants']);
    Route::get('/products/search-products', [WebsiteAdminOrderController::class, 'searchProductsList']);

    // CRM Leads admin routes
    Route::prefix('crm')->group(function () {
        Route::get('/leads', [WebsiteAdminLeadController::class, 'index']);
        Route::get('/leads/stats', [WebsiteAdminLeadController::class, 'stats']);
        Route::get('/leads/{id}', [WebsiteAdminLeadController::class, 'show']);
        Route::put('/leads/{id}', [WebsiteAdminLeadController::class, 'update']);
        Route::delete('/leads/{id}', [WebsiteAdminLeadController::class, 'destroy']);
    });
});

// System settings endpoints (admin only - not storefront)
Route::prefix('api/v2/system')->group(function () {
    Route::get('/settings', [SystemController::class, 'getSettings']);
});

Route::prefix('api/v2/store')->group(function () {

    // ===============================================
    // PUBLIC ROUTES (No Authentication Required)
    // ===============================================

    // Delivery & Shipping
    Route::get('/delivery-settings', [PublicController::class, 'getDeliverySettings']);
    Route::post('/calculate-delivery', [PublicController::class, 'calculateDeliveryCharge']);

    // Payment Gateway
    Route::get('/payment/gateway', [PublicController::class, 'getActivePaymentGateway']);

    // Search
    Route::get('/search', [PublicController::class, 'searchProducts']);
    Route::get('/search/suggestions', [PublicController::class, 'searchSuggestions']);

    // Contact Form
    Route::post('/contact/submit', [PublicController::class, 'submitContactForm']);

    // Tracking Scripts
    Route::get('/tracking', [PublicController::class, 'getTrackingSettings']);

    // Public Auth Routes (Registration, Login, OTP)
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/send-otp', [AuthController::class, 'resendOtp']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/send-reset-otp', [AuthController::class, 'sendResetOtp']); // Send OTP for password reset
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']); // Reset password with OTP
    Route::get('/auth/test-sms-balance', [AuthController::class, 'testSmsBalance']); // Development only

    // Public Category Routes
    Route::get('/categories', [ProductController::class, 'categories']);
    Route::get('/categories/featured', [CategoryController::class, 'featured']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);

    // Public Product Routes
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/products/hot-deals', [ProductController::class, 'hotDeals']);
    Route::get('/products/featured', [ProductController::class, 'featured']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/products/{slug}/related', [ProductController::class, 'related']);
    Route::get('/categories/{categorySlug}/products', [ProductController::class, 'byCategory']);

    // Public Order Route (Place Order - works for both guests and authenticated users)
    Route::post('/orders', [OrderController::class, 'placeOrder']);
    Route::post('/orders/verify', [OrderController::class, 'verifyOrder']);
    Route::post('/orders/{invoice_no}/thank-you', [OrderController::class, 'addThankYouProduct']);
    Route::get('/orders/track', [OrderController::class, 'trackOrder']); // Guest order tracking

    // ===============================================
    // PAYMENT GATEWAY ROUTES (SSL Commerz & EPS)
    // ===============================================

    Route::prefix('payments')->group(function () {
        // Initiate payment — routes to SSL Commerz or EPS based on payment_method field
        Route::post('/initiate', [PaymentGatewayController::class, 'initiatePayment']);

        // EMI options (SSL Commerz only)
        Route::post('/emi-options', [PaymentGatewayController::class, 'emiOptions']);

        // Payment callbacks — SSL Commerz sends POST, EPS sends GET; both accepted
        Route::match(['get', 'post'], '/success', [PaymentGatewayController::class, 'success'])->name('payment.success');
        Route::match(['get', 'post'], '/fail', [PaymentGatewayController::class, 'fail'])->name('payment.fail');
        Route::match(['get', 'post'], '/cancel', [PaymentGatewayController::class, 'cancel'])->name('payment.cancel');

        // IPN webhooks (server-to-server)
        Route::post('/ipn', [PaymentGatewayController::class, 'epsIPN']);
        Route::post('/sslcommerz/ipn', [PaymentGatewayController::class, 'sslCommerzIPN']);
    });

    // Payment verification cron (accessible via secret key)
    Route::get('/payments/verify-pending', [PaymentGatewayController::class, 'verifyPending']);

    // Thank You Products (public - for order confirmation page)
    Route::get('/thank-you-products', [ProductController::class, 'thankYouProducts']);

    // Coupons (public - for cart)
    Route::post('/coupons/validate', [CouponController::class, 'checkCoupon']);
    Route::post('/coupons/auto-apply', [CouponController::class, 'autoApply']);

    // Public Sliders (Storefront)
    Route::get('/sliders', [StorefrontSliderController::class, 'index']);

    // Cross Sale Products for Cart (public)
    Route::get('/cross-sale-products', [ProductController::class, 'crossSaleForCart']);

    // Public Reviews Routes
    Route::get('/reviews', [ReviewController::class, 'index']);
    Route::get('/reviews/featured', [ReviewController::class, 'featured']);
    Route::get('/reviews/product/{productSlug}', [ReviewController::class, 'getByProductSlug']);

    // SteadFast Webhook (public endpoint for courier notifications)
    Route::post('/webhook/steadfast', [SteadfastWebhookController::class, 'handle']);

    // ===============================================
    // GUEST ACCOUNT SETUP (Public - No auth required)
    // ===============================================

    Route::prefix('account')->group(function () {
        // Check if phone can setup account (for guest checkout flow)
        Route::get('/can-setup', [AccountController::class, 'canSetupAccount']);
        // Get customer by phone (for returning customer detection)
        Route::get('/by-phone', [AccountController::class, 'getCustomerByPhone']);
        // Setup account password (after guest places order)
        Route::post('/setup', [AccountController::class, 'setupAccount']);
    });

    // ===============================================
    // AUTHENTICATED CUSTOMER ROUTES
    // ===============================================

    Route::middleware(['auth', \Illuminate\Routing\Middleware\SubstituteBindings::class])->prefix('account')->group(function () {

        // Customer Account Management
        Route::get('/me', [AccountController::class, 'me']);
        Route::post('/logout', [AccountController::class, 'logout']);
        Route::put('/profile', [AccountController::class, 'updateProfile']);

        // Customer Addresses
        Route::get('/addresses', [AccountController::class, 'getAddresses']);
        Route::post('/addresses', [AccountController::class, 'addAddress']);
        Route::put('/addresses/{address}', [AccountController::class, 'updateAddress']);
        Route::delete('/addresses/{address}', [AccountController::class, 'deleteAddress']);

        // Customer Orders
        Route::get('/orders', [OrderController::class, 'myOrders']);
        Route::get('/orders/summary', [OrderController::class, 'orderSummary']);
        Route::get('/orders/{invoice_no}', [OrderController::class, 'show']);
    });

});
