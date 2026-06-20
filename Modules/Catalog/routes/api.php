<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Catalog\Http\Controllers\CatalogController;
use App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\ProductController;
use App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\CategoryController;
use App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\BrandController;

// V1 API Routes (Legacy)
Route::middleware(['auth:sanctum'])->prefix('v1')->group(function () {
    Route::apiResource('catalogs', CatalogController::class)->names('catalog');
});

// V2 API Routes (Current)
Route::prefix('v2/catalog')->group(function () {
    // Public Routes - No authentication required (safe data only)
    Route::get('/categories/dropdown', [CategoryController::class, 'dropdown']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{slug}', [CategoryController::class, 'show']);

    // Brands - Public Routes
    Route::get('/brands/dropdown', [BrandController::class, 'dropdown']);
    Route::get('/brands', [BrandController::class, 'index']);
    Route::get('/brands/{slug}', [BrandController::class, 'show']);

    // Storefront Public Routes - Safe product data for customers (NO authentication)
    // Only returns safe fields: id, name, slug, thumbnail, price, stock, stock_status
    // EXCLUDES: purchaseCost, internal data, wholesale pricing, etc.
    Route::get('/storefront/products', [ProductController::class, 'storefrontIndex']);
    Route::get('/storefront/products/{slug}', [ProductController::class, 'storefrontShow']);

    // Thank You Page - Public Route for order confirmation page upsell
    Route::get('/thank-you-products', [ProductController::class, 'thankYouProducts']);

    // ADMIN ONLY - Permission-based access control (follows permission system)
    Route::middleware(['auth:sanctum'])->group(function () {
        // Products Management - Full access including sensitive data
        // Requires catalog.products.index permission
        Route::get('/products', [ProductController::class, 'index'])->middleware('permission:catalog.products.index');
        Route::get('/products/{slug}', [ProductController::class, 'show'])->middleware('permission:catalog.products.index');
        Route::post('/products', [ProductController::class, 'store'])->middleware('permission:catalog.products.create');
        Route::patch('/products/{id}/status', [ProductController::class, 'updateStatus'])->middleware('permission:catalog.products.edit');
        Route::put('/products/{identifier}', [ProductController::class, 'update'])->middleware('permission:catalog.products.edit');
        Route::delete('/products/{identifier}', [ProductController::class, 'destroy'])->middleware('permission:catalog.products.delete');

        // Categories Management
        Route::post('/categories', [CategoryController::class, 'store'])->middleware('permission:catalog.categories.create');
        Route::put('/categories/{id}', [CategoryController::class, 'update'])->middleware('permission:catalog.categories.edit');
        Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])->middleware('permission:catalog.categories.delete');

        // Brands Management
        Route::post('/brands', [BrandController::class, 'store'])->middleware('permission:catalog.brands.create');
        Route::put('/brands/{id}', [BrandController::class, 'update'])->middleware('permission:catalog.brands.edit');
        Route::delete('/brands/{id}', [BrandController::class, 'destroy'])->middleware('permission:catalog.brands.delete');

        // Discount/Coupon Management (Admin)
        Route::post('/discounts/bulk-generate', [\App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\DiscountController::class, 'bulkGenerate'])->middleware('permission:catalog.discounts.bulk-generate');
        Route::post('/discounts/check-validity', [\App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\DiscountController::class, 'checkValidity'])->middleware('permission:catalog.discounts.check-validity');
        Route::post('/discounts/{id}/toggle-status', [\App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\DiscountController::class, 'toggleStatus'])->middleware('permission:catalog.discounts.toggle-status');
        Route::apiResource('/discounts', \App\Modules\Catalog\Http\Controllers\Api\V2\Catalog\DiscountController::class)
            ->middleware([
                'store' => 'permission:catalog.discounts.create',
                'update' => 'permission:catalog.discounts.edit',
                'destroy' => 'permission:catalog.discounts.delete',
            ]);
    });
});
