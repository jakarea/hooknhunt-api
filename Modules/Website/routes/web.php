<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Website\Http\Controllers\WebsiteController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('websites', WebsiteController::class)->names('website');
});
