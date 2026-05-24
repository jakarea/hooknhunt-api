<?php

use Illuminate\Support\Facades\Route;
use App\Modules\System\Http\Controllers\CoreController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('cores', CoreController::class)->names('web.core');
});
