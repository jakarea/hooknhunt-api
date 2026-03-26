<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\View;
/*
|--------------------------------------------------------------------------
| System Refresh (Optional – secure it later)
|--------------------------------------------------------------------------
*/
Route::get('/system/refresh', function () {
    Artisan::call('storage:link');
    Artisan::call('cache:clear');
    Artisan::call('config:clear');
    Artisan::call('config:cache');
    Artisan::call('route:clear');
    Artisan::call('view:clear');
    Artisan::call('optimize:clear');

    return response()->json([
        'status' => 'success',
        'message' => 'System refreshed successfully',
    ]);
});

/*
|--------------------------------------------------------------------------
| React SPA Catch-All
|--------------------------------------------------------------------------
| Root (/) সহ সব non-API request React index.html serve করবে
*/
Route::get('/{any}', function () {
    return View::make('app');
})->where('any', '^(?!api|sanctum).*$');

