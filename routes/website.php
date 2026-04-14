<?php

use App\Http\Controllers\Api\V2\CategoryController;
use App\Http\Controllers\Api\V2\AuthController;
use App\Http\Controllers\Api\V2\Website\ProductController;
use App\Http\Controllers\Api\V2\Website\AccountController;
use App\Http\Controllers\Api\V2\Website\OrderController;
use App\Http\Controllers\Api\V2\Website\StorefrontSliderController;
use App\Http\Controllers\Api\V2\PaymentGatewayController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// WEBSITE API (For Next.js Website)
// This file contains all routes for the public website

Route::prefix('api')->group(function () {
    Route::prefix('v2/store')->group(function () {

    // ===============================================
    // PUBLIC ROUTES (No Authentication Required)
    // ===============================================

    // Public Auth Routes (Registration, Login, OTP)
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/send-otp', [AuthController::class, 'resendOtp']);
    Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp']);
    Route::post('/auth/send-reset-otp', [AuthController::class, 'sendResetOtp']); // Send OTP for password reset
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']); // Reset password with OTP
    Route::get('/auth/test-sms-balance', [AuthController::class, 'testSmsBalance']); // Development only

    // Public Category Routes
    Route::get('/categories', [CategoryController::class, 'index']);
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

    // ===============================================
    // PAYMENT GATEWAY ROUTES (SSL Commerz)
    // ===============================================
    Route::prefix('payments')->group(function () {
        // Initiate payment
        Route::post('/initiate', [PaymentGatewayController::class, 'initiate']);

        // EMI options
        Route::post('/emi-options', [PaymentGatewayController::class, 'emiOptions']);

        // SSL Commerz callbacks (webhooks)
        Route::post('/success', [PaymentGatewayController::class, 'success']);
        Route::post('/fail', [PaymentGatewayController::class, 'fail']);
        Route::post('/cancel', [PaymentGatewayController::class, 'cancel']);
        Route::post('/ipn', [PaymentGatewayController::class, 'ipn']);

        // Authenticated payment status check
        Route::middleware(['auth', \Illuminate\Routing\Middleware\SubstituteBindings::class])->group(function () {
            Route::get('/status/{tran_id}', [PaymentGatewayController::class, 'status']);
        });
    });

    // Payment verification cron (accessible via secret key)
    Route::get('/payments/verify-pending', [PaymentGatewayController::class, 'verifyPending']);

    // Thank You Products (public - for order confirmation page)
    Route::get('/thank-you-products', [ProductController::class, 'thankYouProducts']);

    // Public Sliders (Storefront)
    Route::get('/sliders', [StorefrontSliderController::class, 'index']);

    // Cross Sale Products for Cart (public)
    Route::get('/cross-sale-products', [ProductController::class, 'crossSaleForCart']);

    // We will add public '/brands' routes here in a future step
    // We will add public '/pages' routes here in a future step (About, Contact, etc.)

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

        // We will add '/wishlist' here in a future step
        // We will add '/reviews' here in a future step
    });

    // ===============================================
    // WEBSITE FUNCTIONALITY ROUTES
    // ===============================================

        // We will add '/search' route here in a future step
        // We will add '/contact' route here in a future step
        // We will add '/newsletter' route here in a future step
        // We will add '/reviews' public routes here in a future step

    });
});