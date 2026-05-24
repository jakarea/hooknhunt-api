<?php

use Illuminate\Support\Facades\Route;
use App\Modules\CMS\Http\Controllers\CMSController;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::resource('cms', CMSController::class)->names('cms');
});
