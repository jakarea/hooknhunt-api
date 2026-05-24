<?php

use App\Modules\HRM\Http\Controllers\Api\V2\Hrm\StaffController;
use App\Modules\HRM\Http\Controllers\Api\V2\Hrm\AttendanceController;
use App\Modules\HRM\Http\Controllers\Api\V2\Hrm\LeaveController;
use App\Modules\HRM\Http\Controllers\Api\V2\Hrm\PayrollController;
use App\Modules\HRM\Http\Controllers\Api\V2\Hrm\DepartmentController;
use Illuminate\Support\Facades\Route;

// ====================================================
// HRM MODULE ROUTES
// ====================================================

// ====================================================
// STAFF MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/hrm',
    'namespace' => 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm',
    'middleware' => ['auth:sanctum', 'permission:hrm.staff.index']
], function () {
    Route::apiResource('staff', 'StaffController');
    Route::post('staff/{id}/block', [StaffController::class, 'block'])->middleware('permission:hrm.staff.edit');
    Route::post('staff/{id}/unblock', [StaffController::class, 'unblock'])->middleware('permission:hrm.staff.edit');
    Route::get('staff/{id}/profile', [StaffController::class, 'profile']);
    Route::put('staff/{id}/profile', [StaffController::class, 'updateProfile'])->middleware('permission:hrm.staff.edit');
});

// ====================================================
// ATTENDANCE MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/hrm',
    'namespace' => 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm',
    'middleware' => ['auth:sanctum']
], function () {
    // Attendance routes accessible to all authenticated users
    Route::get('attendance', [AttendanceController::class, 'index']);
    Route::post('attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::get('attendance/{id}', [AttendanceController::class, 'show']);
    Route::put('attendance/{id}', [AttendanceController::class, 'update'])->middleware('permission:hrm.attendance.manage');
    Route::delete('attendance/{id}', [AttendanceController::class, 'destroy'])->middleware('permission:hrm.attendance.manage');
    Route::get('attendance/today', [AttendanceController::class, 'today']);
    Route::get('attendance/report', [AttendanceController::class, 'report'])->middleware('permission:hrm.attendance.reports');
});

// ====================================================
// LEAVE MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/hrm',
    'namespace' => 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm',
    'middleware' => ['auth:sanctum']
], function () {
    // Leave routes accessible to all authenticated users
    Route::get('leaves', [LeaveController::class, 'index']);
    Route::post('leaves', [LeaveController::class, 'store']);
    Route::get('leaves/{id}', [LeaveController::class, 'show']);
    Route::put('leaves/{id}', [LeaveController::class, 'update']);
    Route::delete('leaves/{id}', [LeaveController::class, 'destroy']);

    // Management routes (require permissions)
    Route::post('leaves/{id}/approve', [LeaveController::class, 'approve'])->middleware('permission:hrm.leaves.approve');
    Route::post('leaves/{id}/reject', [LeaveController::class, 'reject'])->middleware('permission:hrm.leaves.approve');
    Route::get('leaves/my-requests', [LeaveController::class, 'myRequests']);
    Route::get('leaves/balance/{staffId}', [LeaveController::class, 'balance']);
});

// ====================================================
// PAYROLL MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/hrm',
    'namespace' => 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm',
    'middleware' => ['auth:sanctum', 'permission:hrm.payroll.index']
], function () {
    Route::apiResource('payroll', 'PayrollController');
    Route::post('payroll/generate', [PayrollController::class, 'generate'])->middleware('permission:hrm.payroll.generate');
    Route::post('payroll/{id}/process', [PayrollController::class, 'process'])->middleware('permission:hrm.payroll.process');
    Route::get('payroll/{id}/payslip', [PayrollController::class, 'payslip']);
    Route::get('payroll/report', [PayrollController::class, 'report']);
});

// ====================================================
// DEPARTMENT MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/hrm',
    'namespace' => 'App\Modules\HRM\Http\Controllers\Api\V2\Hrm',
    'middleware' => ['auth:sanctum', 'permission:hrm.departments.index']
], function () {
    Route::apiResource('departments', 'DepartmentController');
    Route::get('departments/{id}/staff', [DepartmentController::class, 'staff']);
    Route::get('departments/tree', [DepartmentController::class, 'tree']);
});
