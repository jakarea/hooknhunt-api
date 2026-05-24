<?php

use App\Modules\Inventory\Http\Controllers\Api\V2\InventoryController;
use App\Modules\Inventory\Http\Controllers\Api\V2\InventorySortingController;
use App\Modules\Inventory\Http\Controllers\Api\V2\WarehouseController;
use Illuminate\Support\Facades\Route;

// ====================================================
// INVENTORY MODULE ROUTES
// ====================================================

// ====================================================
// WAREHOUSE MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/inventory',
    'namespace' => 'App\Modules\Inventory\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:inventory.warehouses.index']
], function () {
    Route::apiResource('warehouses', 'WarehouseController');
    Route::get('warehouses/{id}/stock', [WarehouseController::class, 'stock']);
    Route::post('warehouses/{id}/transfer', [WarehouseController::class, 'transfer'])->middleware('permission:inventory.warehouses.transfer');
});

// ====================================================
// INVENTORY MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/inventory',
    'namespace' => 'App\Modules\Inventory\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:inventory.stock.index']
], function () {
    Route::get('stock', [InventoryController::class, 'index']);
    Route::get('stock/product/{productId}', [InventoryController::class, 'productStock']);
    Route::get('stock/batch/{batchId}', [InventoryController::class, 'batchDetails']);
    Route::post('stock/adjust', [InventoryController::class, 'adjust'])->middleware('permission:inventory.stock.adjust');
    Route::post('stock/transfer', [InventoryController::class, 'transfer'])->middleware('permission:inventory.stock.transfer');
    Route::get('stock/movements', [InventoryController::class, 'movements']);
    Route::get('stock/report', [InventoryController::class, 'report']);
});

// ====================================================
// INVENTORY SORTING
// ====================================================
Route::group([
    'prefix' => 'v2/inventory',
    'namespace' => 'App\Modules\Inventory\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:inventory.sorting.index']
], function () {
    Route::get('sorting', [InventorySortingController::class, 'index']);
    Route::post('sorting/assign', [InventorySortingController::class, 'assign'])->middleware('permission:inventory.sorting.assign');
    Route::post('sorting/complete', [InventorySortingController::class, 'complete'])->middleware('permission:inventory.sorting.complete');
    Route::get('sorting/pending', [InventorySortingController::class, 'pending']);
});
