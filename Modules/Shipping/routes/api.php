<?php

use App\Modules\Shipping\Http\Controllers\Api\V2\CourierController;
use Illuminate\Support\Facades\Route;

// ====================================================
// SHIPPING MODULE ROUTES
// ====================================================

// ====================================================
// COURIER MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/shipping',
    'namespace' => 'App\Modules\Shipping\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:shipping.couriers.index']
], function () {
    Route::apiResource('couriers', 'CourierController');
    Route::post('couriers/{id}/test', [CourierController::class, 'testConnection'])->middleware('permission:shipping.couriers.test');
    Route::get('couriers/{id}/zones', [CourierController::class, 'zones']);
    Route::post('couriers/{id}/zones', [CourierController::class, 'createZone'])->middleware('permission:shipping.couriers.zones');
    Route::put('couriers/{id}/zones/{zoneId}', [CourierController::class, 'updateZone'])->middleware('permission:shipping.couriers.zones');
    Route::delete('couriers/{id}/zones/{zoneId}', [CourierController::class, 'deleteZone'])->middleware('permission:shipping.couriers.zones');
});

// ====================================================
// SHIPPING OPERATIONS
// ====================================================
Route::group([
    'prefix' => 'v2/shipping',
    'namespace' => 'App\Modules\Shipping\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:shipping.orders.index']
], function () {
    Route::get('orders/pending', [CourierController::class, 'pendingOrders']);
    Route::post('orders/{orderId}/assign', [CourierController::class, 'assignCourier'])->middleware('permission:shipping.orders.assign');
    Route::post('orders/{orderId}/cancel', [CourierController::class, 'cancelShipment'])->middleware('permission:shipping.orders.cancel');
    Route::get('orders/{orderId}/tracking', [CourierController::class, 'tracking']);
    Route::post('orders/{orderId}/sync-tracking', [CourierController::class, 'syncTracking'])->middleware('permission:shipping.orders.sync');
    Route::get('orders/{orderId}/label', [CourierController::class, 'shippingLabel']);
});

// ====================================================
// SHIPPING RATES
// ====================================================
Route::group([
    'prefix' => 'v2/shipping',
    'namespace' => 'App\Modules\Shipping\Http\Controllers\Api\V2',
    'middleware' => ['auth']
], function () {
    Route::post('rates/calculate', [CourierController::class, 'calculateRate']);
    Route::get('rates/couriers', [CourierController::class, 'availableCouriers']);
});
