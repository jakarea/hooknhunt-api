<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Inventory\Http\Controllers\InventoryController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('inventories', InventoryController::class)->names('inventory');
});
