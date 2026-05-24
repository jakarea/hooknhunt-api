<?php

use App\Modules\CMS\Http\Controllers\Api\V2\LandingPageController;
use App\Modules\CMS\Http\Controllers\Api\V2\MenuController;
use App\Modules\CMS\Http\Controllers\Api\V2\MediaController;
use Illuminate\Support\Facades\Route;

// ====================================================
// CMS MODULE ROUTES
// ====================================================

// ====================================================
// MEDIA MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/media',
    'namespace' => 'App\Modules\CMS\Http\Controllers\Api\V2',
    'middleware' => ['auth:sanctum', 'permission:cms.media.view']
], function () {
    // Folders
    Route::get('folders', [MediaController::class, 'getFolders']);
    Route::post('folders', [MediaController::class, 'createFolder'])->middleware('permission:cms.media.folders.create');
    Route::put('folders/{id}', [MediaController::class, 'updateFolder'])->middleware('permission:cms.media.folders.edit');
    Route::delete('folders/{id}', [MediaController::class, 'deleteFolder'])->middleware('permission:cms.media.folders.delete');

    // Files
    Route::get('files', [MediaController::class, 'getFiles']);
    Route::get('files/{id}', [MediaController::class, 'getFile']);
    Route::put('files/{id}', [MediaController::class, 'updateFile']);
    Route::post('upload', [MediaController::class, 'upload'])->middleware('permission:cms.media.files.upload');
    Route::post('files/bulk-move', [MediaController::class, 'bulkMoveFiles'])->middleware('permission:cms.media.files.move');
    Route::delete('files/bulk-delete', [MediaController::class, 'bulkDelete'])->middleware('permission:cms.media.files.delete');
});

// ====================================================
// LANDING PAGES
// ====================================================
Route::group([
    'prefix' => 'v2/cms',
    'namespace' => 'App\Modules\CMS\Http\Controllers\Api\V2',
    'middleware' => ['auth:sanctum', 'permission:cms.landing-pages.index']
], function () {
    Route::apiResource('landing-pages', 'LandingPageController');
    Route::get('landing-pages/{id}/preview', [LandingPageController::class, 'preview']);
});

// ====================================================
// MENUS
// ====================================================
Route::group([
    'prefix' => 'v2/cms',
    'namespace' => 'App\Modules\CMS\Http\Controllers\Api\V2',
    'middleware' => ['auth:sanctum', 'permission:cms.menus.index']
], function () {
    Route::apiResource('menus', 'MenuController');
    Route::post('menus/{id}/reorder', [MenuController::class, 'reorder'])->middleware('permission:cms.menus.edit');
});
