<?php

use App\Modules\Procurement\Http\Controllers\Api\V2\ProcurementController;
use App\Modules\Procurement\Http\Controllers\Api\V2\SupplierController;
use Illuminate\Support\Facades\Route;

// ====================================================
// PROCUREMENT MODULE ROUTES
// ====================================================

// ====================================================
// SUPPLIER MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/procurement',
    'namespace' => 'App\Modules\Procurement\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:procurement.suppliers.index']
], function () {
    Route::apiResource('suppliers', 'SupplierController');
    Route::get('suppliers/{id}/products', [SupplierController::class, 'products']);
    Route::get('suppliers/{id}/ledger', [SupplierController::class, 'ledger']);
    Route::post('suppliers/{id}/approve', [SupplierController::class, 'approve'])->middleware('permission:procurement.suppliers.approve');
    Route::post('suppliers/{id}/reject', [SupplierController::class, 'reject'])->middleware('permission:procurement.suppliers.approve');
});

// ====================================================
// PROCUREMENT WORKFLOWS
// ====================================================
Route::group([
    'prefix' => 'v2/procurement',
    'namespace' => 'App\Modules\Procurement\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:procurement.orders.index']
], function () {
    Route::get('purchase-orders', [ProcurementController::class, 'purchaseOrders']);
    Route::post('purchase-orders', [ProcurementController::class, 'createPurchaseOrder'])->middleware('permission:procurement.orders.create');
    Route::get('purchase-orders/{id}', [ProcurementController::class, 'showPurchaseOrder']);
    Route::put('purchase-orders/{id}', [ProcurementController::class, 'updatePurchaseOrder'])->middleware('permission:procurement.orders.edit');
    Route::post('purchase-orders/{id}/approve', [ProcurementController::class, 'approvePurchaseOrder'])->middleware('permission:procurement.orders.approve');
    Route::post('purchase-orders/{id}/reject', [ProcurementController::class, 'rejectPurchaseOrder'])->middleware('permission:procurement.orders.approve');
});
