<?php

use Illuminate\Support\Facades\Route;
use App\Modules\HRM\Http\Controllers\HRMController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('hrms', HRMController::class)->names('hrm');
});
