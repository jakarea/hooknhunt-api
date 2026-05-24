<?php

use App\Modules\Admin\Http\Controllers\Api\V2\UserController;
use App\Modules\Admin\Http\Controllers\Api\V2\RoleController;
use App\Modules\Admin\Http\Controllers\Api\V2\PermissionController;
use App\Modules\Admin\Http\Controllers\Api\V2\AuditController;
use Illuminate\Support\Facades\Route;

// ====================================================
// ADMIN MODULE ROUTES
// ====================================================

// ====================================================
// SYSTEM MODULE - USER MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/system',
    'namespace' => 'App\Modules\Admin\Http\Controllers\Api\V2',
    'middleware' => ['auth']
], function () {
    Route::apiResource('users', 'UserController')->middleware(['permission:user-management.index']);
    Route::prefix('users')->group(function () {
        Route::get('{id}/roles', [UserController::class, 'getRoles']);
        Route::post('{id}/roles', [UserController::class, 'assignRoles']);
        Route::get('{id}/permissions', [UserController::class, 'getPermissions']);
        Route::post('{id}/permissions', [UserController::class, 'assignPermissions']);
    });
});

// ====================================================
// SYSTEM MODULE - ROLE & PERMISSION MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/system',
    'namespace' => 'App\Modules\Admin\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:role-management.index']
], function () {
    Route::apiResource('roles', 'RoleController');
    Route::get('roles/{id}/permissions', [RoleController::class, 'getPermissions']);
    Route::post('roles/{id}/permissions', [RoleController::class, 'assignPermissions']);
    Route::get('roles/{id}/users', [RoleController::class, 'getUsers']);

    Route::apiResource('permissions', 'PermissionController')->only(['index', 'show']);
});

// ====================================================
// SYSTEM MODULE - AUDIT LOGS
// ====================================================
Route::group([
    'prefix' => 'api/v2/system',
    'namespace' => 'App\Modules\Admin\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:admin.audit-logs.index']
], function () {
    Route::get('audit-logs', [AuditController::class, 'index']);
    Route::get('audit-logs/{fileName}/preview', [AuditController::class, 'preview']);
    Route::get('audit-logs/{fileName}/download', [AuditController::class, 'download']);
    Route::delete('audit-logs/{fileName}', [AuditController::class, 'destroy'])->middleware('permission:admin.audit-logs.delete');
});
