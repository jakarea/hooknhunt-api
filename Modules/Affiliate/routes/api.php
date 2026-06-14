<?php

use App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate\Controller;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\AdminAffiliateController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\PayoutController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\CategoryCommissionController;
use App\Modules\Affiliate\Http\Controllers\Api\V2\Admin\ProductCommissionController;
use Illuminate\Support\Facades\Route;

// ====================================================
// AFFILIATE MODULE ROUTES
// ====================================================

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
// STOREFRONT AFFILIATE ROUTES (Public Website)
// ====================================================
Route::group([
    'prefix' => 'v2',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate',
    'middleware' => ['auth:sanctum'],
], function () {
    // Affiliate status check (direct route without /store/)
    Route::get('affiliate/check', 'WebsiteAffiliateController@check');
    Route::get('store/affiliate/products', 'WebsiteAffiliateController@products');
    Route::post('affiliate/update-referral-code', 'WebsiteAffiliateController@updateReferralCode');
});

Route::group([
    'prefix' => 'v2/store',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate',
    'middleware' => ['auth'],
], function () {
    Route::post('affiliate/apply', 'WebsiteAffiliateController@apply');
    Route::get('affiliate/dashboard', 'WebsiteAffiliateController@dashboard');
    Route::post('affiliate/payout-request', 'WebsiteAffiliateController@requestPayout');
});

// ====================================================
// AFFILIATE STOREFRONT ROUTES (Public Website)
// ====================================================
Route::group([
    'prefix' => 'v2/store',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate',
    'middleware' => ['auth'],
], function () {
    Route::post('affiliate/apply', 'WebsiteAffiliateController@apply');
    Route::get('affiliate/dashboard', 'WebsiteAffiliateController@dashboard');
    Route::post('affiliate/payout-request', 'WebsiteAffiliateController@requestPayout');
});

// ====================================================
// PUBLIC AFFILIATE ROUTES (No authentication required)
// ====================================================
Route::group([
    'prefix' => 'v2/store',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Affiliate',
], function () {
    // Track affiliate visit (public, no auth needed)
    Route::post('affiliate/track', 'WebsiteAffiliateController@track');
    // Verify referral code is valid (public, no auth needed)
    Route::get('affiliate/verify-code', 'WebsiteAffiliateController@verifyCode');
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

// ====================================================
// WEBSITE ADMIN AFFILIATE MANAGEMENT (Frontend Admin Panel)
// ====================================================
Route::group([
    'prefix' => 'v2/website-admin',
    'namespace' => 'App\Modules\Affiliate\Http\Controllers\Api\V2\Admin',
    'middleware' => ['auth']
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
    Route::apiResource('affiliates', AdminAffiliateController::class)->only(['index', 'show', 'update', 'destroy']);

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
