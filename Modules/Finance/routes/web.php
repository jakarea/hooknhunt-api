<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Finance\Http\Controllers\FinanceController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('finances', FinanceController::class)->names('finance');
});
