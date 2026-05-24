<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Shipping\Http\Controllers\ShippingController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('shippings', ShippingController::class)->names('shipping');
});
