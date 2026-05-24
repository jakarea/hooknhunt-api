<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| LazyChat Integration API Routes (Notion Compliant)
|--------------------------------------------------------------------------
|
| These routes follow the Notion documentation specification exactly:
| - GET /api/products - Initial inventory sync
| - POST /api/order/create - Order creation from LazyChat AI
|
| All routes require Bearer token authentication (LAZYCHAT_API_TOKEN)
|
| Controller: App\Http\Controllers\Api\V2\LazychatRetailController
|
*/

Route::group([
    'middleware' => ['lazychat.auth'],
], function () {
    // Step 1: Initial inventory sync
    // LazyChat fetches all products from this endpoint
    // GET /api/products
    Route::get('/products', 'App\Http\Controllers\Api\V2\LazychatRetailController@products');

    // Get single product by ID (optional - for testing/debugging)
    // GET /api/products/{id}
    Route::get('/products/{id}', 'App\Http\Controllers\Api\V2\LazychatRetailController@showProduct');

    // Step 3: Order creation
    // LazyChat AI posts orders to this endpoint
    // POST /api/order/create
    Route::post('/order/create', 'App\Http\Controllers\Api\V2\LazychatRetailController@receiveOrder');
});
