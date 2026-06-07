<?php

use Illuminate\Support\Facades\Route;
use App\Modules\System\Http\Controllers\SystemController;
use App\Modules\Admin\Http\Controllers\Admin\PaymentSettingsController;

// V2 System API Routes
Route::prefix('v2/system')->group(function () {
    // Public routes
    Route::get('/settings/payment', [PaymentSettingsController::class, 'index'])->name('system.settings.payment.index');

    // Authenticated routes
    Route::middleware(['auth:sanctum'])->group(function () {
        // Payment settings routes
        Route::put('/settings/payment/gateway', [PaymentSettingsController::class, 'updateGateway'])->name('system.settings.payment.updateGateway');
        Route::post('/settings/payment/eps/test', [PaymentSettingsController::class, 'testEPS'])->name('system.settings.payment.testEPS');

        // System management endpoints (if needed)
        // Route::apiResource('settings', SystemController::class)->names('system.settings');
    });
});

// Legacy V1 routes (for backward compatibility)
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('cores', SystemController::class)->names('api.core');
});
