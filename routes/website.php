<?php

use App\Http\Controllers\Api\V2\CategoryController;
use App\Http\Controllers\Api\V2\ProductController;
use App\Http\Controllers\Api\V2\AuthController;
use App\Http\Controllers\Api\V2\Website\AccountController;
use App\Http\Controllers\Api\V2\Website\OrderController;
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
    Route::post('/auth/send-otp', [AuthController::class, 'sendOtp']);
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
    Route::get('/products/featured', [ProductController::class, 'featured']);
    Route::get('/products/{slug}', [ProductController::class, 'show']);
    Route::get('/products/{slug}/related', [ProductController::class, 'related']);
    Route::get('/categories/{categorySlug}/products', [ProductController::class, 'byCategory']);

    // Public Order Route (Place Order - works for both guests and authenticated users)
    Route::post('/orders', [OrderController::class, 'placeOrder']);
    Route::post('/orders/verify', [OrderController::class, 'verifyOrder']);

    // We will add public '/brands' routes here in a future step
    // We will add public '/pages' routes here in a future step (About, Contact, etc.)

    // ===============================================
    // AUTHENTICATED CUSTOMER ROUTES
    // ===============================================

    Route::middleware('auth:sanctum')->prefix('account')->group(function () {

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
        Route::get('/orders/{order}', [OrderController::class, 'show']);

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