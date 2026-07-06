<?php

use App\Modules\CRM\Http\Controllers\Api\V2\CustomerController;
use App\Modules\CRM\Http\Controllers\Api\V2\Crm\LeadController;
use App\Modules\CRM\Http\Controllers\Api\V2\Crm\ActivityController;
use App\Modules\CRM\Http\Controllers\Api\V2\Crm\CampaignController;
use App\Modules\CRM\Http\Controllers\Api\V2\Crm\CustomerController as CrmCustomerController;
use Illuminate\Support\Facades\Route;

// ====================================================
// CRM MODULE ROUTES
// ====================================================

// ====================================================
// LEAD MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'api/v2/crm',
    'namespace' => 'App\Modules\CRM\Http\Controllers\Api\V2\Crm',
    'middleware' => ['auth', 'permission:crm.leads.index']
], function () {
    Route::apiResource('leads', 'LeadController');
    Route::post('leads/{id}/convert', [LeadController::class, 'convertToCustomer'])->middleware('permission:crm.leads.convert');
    Route::post('leads/capture-checkout', [LeadController::class, 'captureCheckoutLead']);
    Route::post('leads/contact-submit', [LeadController::class, 'contactSubmit']);
});

// ====================================================
// CRM ACTIVITIES
// ====================================================
Route::group([
    'prefix' => 'api/v2/crm',
    'namespace' => 'App\Modules\CRM\Http\Controllers\Api\V2\Crm',
    'middleware' => ['auth']
], function () {
    Route::apiResource('activities', 'ActivityController')->middleware(['permission:crm.activities.index']);
    Route::get('activities/timeline/{type}/{id}', [ActivityController::class, 'timeline']);
});

// ====================================================
// CRM CAMPAIGNS
// ====================================================
Route::group([
    'prefix' => 'api/v2/crm',
    'namespace' => 'App\Modules\CRM\Http\Controllers\Api\V2\Crm',
    'middleware' => ['auth', 'permission:crm.campaigns.index']
], function () {
    Route::apiResource('campaigns', 'CampaignController');
    Route::post('campaigns/{id}/send', [CampaignController::class, 'send'])->middleware('permission:crm.campaigns.send');
    Route::get('campaigns/{id}/stats', [CampaignController::class, 'stats']);
});

// ====================================================
// CUSTOMER MANAGEMENT (CRM)
// ====================================================
Route::group([
    'prefix' => 'api/v2/crm',
    'namespace' => 'App\Modules\CRM\Http\Controllers\Api\V2\Crm',
    'middleware' => ['auth', 'permission:crm.customers.index']
], function () {
    Route::apiResource('customers', 'CustomerController');
    Route::get('customers/stats', [CrmCustomerController::class, 'stats']);
    Route::get('customers/{id}/orders', [CrmCustomerController::class, 'orders']);
    Route::get('customers/{id}/activities', [CrmCustomerController::class, 'activities']);
});
