<?php

use Illuminate\Support\Facades\Route;
use App\Modules\System\Http\Controllers\SystemController;

// V2 System API Routes
Route::prefix('v2/system')->group(function () {
    // Authenticated routes
    Route::middleware(['auth:sanctum'])->group(function () {
        // System management endpoints
        Route::apiResource('settings', SystemController::class)->names('system.settings');
    });
});

// Legacy V1 routes (for backward compatibility)
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('cores', SystemController::class)->names('api.core');
});
