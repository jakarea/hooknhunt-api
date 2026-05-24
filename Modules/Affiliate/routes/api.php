<?php

use App\Modules\Affiliate\Http\Controllers\Api\V2\AffiliateController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\AdminAffiliateController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\PayoutController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\ProductCommissionController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\CategoryCommissionController;
use Illuminate\Support\Facades\Route;

// ====================================================
// AFFILIATE MODULE ROUTES
// ====================================================

// ====================================================
// PUBLIC AFFILIATE ROUTES (Check if user is affiliate)
// ====================================================
Route::get('api/v2/affiliate/check', [AffiliateController::class, 'check']);

// ====================================================
// CRM AFFILIATE ROUTES (Integrated with CRM)
// ====================================================
Route::group([
    'prefix' => 'v2/crm',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2',
    'middleware' => ['auth']
], function () {
    Route::apiResource('affiliates', 'AffiliateController')
        ->only(['index', 'store', 'update', 'destroy'])
        ->names('crm.affiliates')
        ->middleware([
            'store' => 'permission:crm.affiliates.create',
            'update' => 'permission:crm.affiliates.edit',
            'destroy' => 'permission:crm.affiliates.delete',
        ]);
});

// ====================================================
// AFFILIATE STOREFRONT ROUTES (Public Website)
// ====================================================
Route::group([
    'prefix' => 'v2/store',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate',
], function () {
    Route::post('affiliate/apply', 'WebsiteAffiliateController@apply');
    Route::get('affiliate/dashboard', 'WebsiteAffiliateController@dashboard');
    Route::post('affiliate/payout-request', 'WebsiteAffiliateController@requestPayout');
});

// ====================================================
// ADMIN AFFILIATE MANAGEMENT
// ====================================================
Route::group([
    'prefix' => 'v2/admin',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Admin',
    'middleware' => ['auth', 'permission:crm.affiliates.index']
], function () {
    // Affiliate management
    Route::get('affiliates/stats', [AdminAffiliateController::class, 'getStats']);
    Route::get('affiliates/{id}/earnings', [AdminAffiliateController::class, 'getEarnings']);
    Route::get('affiliates/{id}/payouts', [AdminAffiliateController::class, 'getPayouts']);
    Route::get('affiliates/{id}/referrals', [AdminAffiliateController::class, 'getReferrals']);
    Route::post('affiliates/{id}/approve', [AdminAffiliateController::class, 'approve']);
    Route::post('affiliates/{id}/reject', [AdminAffiliateController::class, 'reject']);
    Route::post('affiliates/create-from-user', [AdminAffiliateController::class, 'createFromUser']);
    Route::get('users/not-affiliates', [AdminAffiliateController::class, 'getNonAffiliateUsers']);
    Route::apiResource('affiliates', AdminAffiliateController::class)->names('admin.affiliates');

    // Product commissions
    Route::get('products/{id}/commissions', [ProductCommissionController::class, 'getProductCommissions']);
    Route::apiResource('product-commissions', ProductCommissionController::class);

    // Category commissions
    Route::get('categories/{id}/commissions', [CategoryCommissionController::class, 'getCategoryCommissions']);
    Route::apiResource('category-commissions', CategoryCommissionController::class);

    // Payout management
    Route::post('affiliate-payouts/{id}/approve', [PayoutController::class, 'approve']);
    Route::post('affiliate-payouts/{id}/reject', [PayoutController::class, 'reject']);
    Route::post('affiliate-payouts/{id}/complete', [PayoutController::class, 'markCompleted']);
    Route::post('affiliate-payouts/{id}/process', [PayoutController::class, 'markAsProcessing']);
    Route::apiResource('affiliate-payouts', PayoutController::class);
});
