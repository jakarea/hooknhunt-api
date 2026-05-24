<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Procurement\Http\Controllers\ProcurementController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('procurements', ProcurementController::class)->names('procurement');
});
