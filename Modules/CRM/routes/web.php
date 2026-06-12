<?php

use Illuminate\Support\Facades\Route;
use App\Modules\CRM\Http\Controllers\CRMController;

/*
|--------------------------------------------------------------------------
| CRM Web Routes
|--------------------------------------------------------------------------
|
| Human-readable CRM routes for customer management.
| All routes require authentication and email verification.
|
*/

Route::middleware(['auth', 'verified'])->group(function () {

    /*
    |--------------------------------------------------------------------------
    | CRM Dashboard & Index
    |--------------------------------------------------------------------------
    */
    Route::prefix('crm')->group(function () {
        // CRM Dashboard
        Route::get('/', [CRMController::class, 'index'])->name('crm.dashboard');

        // CRM Resource Routes (leads, campaigns, etc)
        Route::resource('leads', 'App\Modules\CRM\Http\Controllers\Api\V2\Crm\LeadController')->names('crm.leads');
        Route::resource('campaigns', 'App\Modules\CRM\Http\Controllers\Api\V2\Crm\CampaignController')->names('crm.campaigns');
    });

    /*
    |--------------------------------------------------------------------------
    | Customer Management Routes (SPA-Style)
    |--------------------------------------------------------------------------
    */
    Route::prefix('crm/customers')->group(function () {
        // Main customers page (list or single customer)
        Route::get('/', [CRMController::class, 'customers'])->name('crm.customers');

        // Single customer details (can use /crm/customers/{id} instead)
        Route::get('/{id}', [CRMController::class, 'customers'])->name('crm.customers.show');

        // Create new customer form
        Route::get('/create', [CRMController::class, 'create'])->name('crm.customers.create');

        // Edit customer form
        Route::get('/{id}/edit', [CRMController::class, 'edit'])->name('crm.customers.edit');

        // Store new customer (POST)
        Route::post('/', [CRMController::class, 'store'])->name('crm.customers.store');

        // Update customer (PUT/PATCH)
        Route::match(['put', 'patch'], '/{id}', [CRMController::class, 'update'])->name('crm.customers.update');

        // Delete customer (DELETE)
        Route::delete('/{id}', [CRMController::class, 'destroy'])->name('crm.customers.destroy');
    });

    /*
    |--------------------------------------------------------------------------
    | Legacy/Alternative Routes
    |--------------------------------------------------------------------------
    */
    Route::resource('crms', CRMController::class)->names('crm');
});
