<?php

use App\Modules\Finance\Http\Controllers\Api\V2\BankController;
use App\Modules\Finance\Http\Controllers\Api\V2\BankReconciliationController;
use App\Modules\Finance\Http\Controllers\Api\V2\AccountController;
use App\Modules\Finance\Http\Controllers\Api\V2\BankTransactionController;
use App\Modules\Finance\Http\Controllers\Api\V2\AccountsPayableController;
use App\Modules\Finance\Http\Controllers\Api\V2\AccountsReceivableController;
use Illuminate\Support\Facades\Route;

// ====================================================
// FINANCE MODULE ROUTES
// ====================================================

// ====================================================
// BANK MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/finance',
    'namespace' => 'App\Modules\Finance\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:finance.banks.index']
], function () {
    Route::apiResource('banks', 'BankController');
    Route::post('banks/{id}/reconcile', [BankController::class, 'reconcile']);
    Route::get('banks/{id}/transactions', [BankController::class, 'transactions']);
});

// ====================================================
// BANK TRANSACTIONS
// ====================================================
Route::group([
    'prefix' => 'v2/finance',
    'namespace' => 'App\Modules\Finance\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:finance.transactions.index']
], function () {
    Route::apiResource('bank-transactions', 'BankTransactionController');
    Route::post('bank-transactions/sync', [BankTransactionController::class, 'syncFromBank']);
});

// ====================================================
// BANK RECONCILIATION
// ====================================================
Route::group([
    'prefix' => 'v2/finance',
    'namespace' => 'App\Modules\Finance\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:finance.reconciliation.index']
], function () {
    Route::apiResource('reconciliations', 'BankReconciliationController');
    Route::post('reconciliations/{id}/complete', [BankReconciliationController::class, 'complete']);
});

// ====================================================
// CHART OF ACCOUNTS
// ====================================================
Route::group([
    'prefix' => 'v2/finance',
    'namespace' => 'App\Modules\Finance\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:finance.accounts.index']
], function () {
    Route::apiResource('accounts', 'AccountController');
    Route::get('accounts/tree', [AccountController::class, 'tree']);
    Route::get('accounts/{id}/balance', [AccountController::class, 'balance']);
});

// ====================================================
// ACCOUNTS PAYABLE
// ====================================================
Route::group([
    'prefix' => 'v2/finance',
    'namespace' => 'App\Modules\Finance\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:finance.accounts-payable.index']
], function () {
    Route::apiResource('accounts-payable', 'AccountsPayableController');
    Route::post('accounts-payable/{id}/pay', [AccountsPayableController::class, 'pay']);
    Route::get('accounts-payable/stats', [AccountsPayableController::class, 'stats']);
});

// ====================================================
// ACCOUNTS RECEIVABLE
// ====================================================
Route::group([
    'prefix' => 'v2/finance',
    'namespace' => 'App\Modules\Finance\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:finance.accounts-receivable.index']
], function () {
    Route::apiResource('accounts-receivable', 'AccountsReceivableController');
    Route::post('accounts-receivable/{id}/collect', [AccountsReceivableController::class, 'collectPayment']);
    Route::get('accounts-receivable/stats', [AccountsReceivableController::class, 'stats']);
});
