<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes V2 (Enterprise Modular Architecture)
|--------------------------------------------------------------------------
*/

// ====================================================
// MODULE: AUTHENTICATION (Public)
// ====================================================
Route::group([
    'prefix' => 'v2/auth',
    'namespace' => 'App\Http\Controllers\Api\V2'
], function () {
    Route::post('register', 'AuthController@register')->middleware('throttle:5,1');
    Route::post('register-super-admin', 'AuthController@registerSuperAdmin')->middleware('throttle:3,1');
    Route::post('verify-otp', 'AuthController@verifyOtp')->middleware('throttle:5,1');
    Route::post('resend-otp', 'AuthController@resendOtp')->middleware('throttle:1,1');
    Route::post('login', 'AuthController@login')->middleware('throttle:5,1');
    Route::post('customer/login', 'AuthController@customerLogin')->middleware('throttle:5,1');
    Route::post('customer/register', 'AuthController@customerRegister')->middleware('throttle:5,1');

    // DEBUG ROUTES - Remove in production
    Route::post('debug/login', 'DebugAuthController@diagnosticLogin');
    Route::get('debug/database', 'DebugAuthController@databaseInfo');
});

// ====================================================
// PROTECTED ROUTES (Middleware: Sanctum)
// ====================================================
Route::group([
    'prefix' => 'v2',
    'middleware' => ['auth'],
    'namespace' => 'App\Http\Controllers\Api\V2'
], function () {

    // ====================================================
    // PUBLIC ROUTES (No Middleware) - System Optimization
    // ====================================================
    Route::get('system/optimize', 'App\Http\Controllers\Api\V2\System\OptimizeController@invoke');

    // --- Profile & Personal Actions ---
    Route::post('auth/logout', 'AuthController@logout');
    Route::get('auth/me', 'AuthController@profile');
    Route::put('auth/profile', 'AuthController@updateProfile');
    Route::put('auth/change-password', 'AuthController@changePassword');
    Route::get('notifications', 'NotificationController@index');
    Route::post('notifications/read', 'NotificationController@markAsRead');

    // --- Module: SYSTEM & ACCESS CONTROL ---
    Route::group(['prefix' => 'system'], function () {
        Route::apiResource('units', 'UnitController');
        Route::get('units/dropdown', 'UnitController@dropdown');
        Route::get('helpers/units', 'UnitController@dropdown');
        Route::apiResource('settings', 'SettingController');
        Route::post('settings/update', 'SettingController@update');

        // System optimization endpoint (admin only, inside auth middleware)
        Route::get('optimize', 'System\OptimizeInvokeController');
    });

    Route::group(['prefix' => 'user-management'], function () {
        Route::get('users', 'UserController@index');
        Route::post('users', 'UserController@store');
        Route::get('users/{id}', 'UserController@show');
        Route::post('users/{id}/ban', 'UserController@banUser');
        Route::post('users/{id}/restore', 'UserController@restore');
        Route::post('users/{id}/direct-permissions', 'UserController@giveDirectPermission');
        Route::delete('users/{id}', 'UserController@destroy');
        Route::put('users/{id}', 'UserController@update');
        Route::post('users/{id}/block-permission', 'UserController@blockPermission');
        Route::put('users/{id}/permissions/granted', 'UserController@syncGrantedPermissions');
        Route::put('users/{id}/permissions/blocked', 'UserController@syncBlockedPermissions');
        Route::get('roles', 'UserController@roleList');
        Route::get('permissions', 'PermissionController@list');
        Route::apiResource('suppliers', 'SupplierController');
    });

    // --- Module: MEDIA ASSETS ---
    Route::group(['prefix' => 'media'], function () {
        // Folders
        Route::get('folders', 'MediaController@getFolders');
        Route::post('folders', 'MediaController@createFolder');
        Route::put('folders/{id}', 'MediaController@updateFolder');
        Route::delete('folders/{id}', 'MediaController@deleteFolder');

        // Files
        Route::get('files', 'MediaController@getFiles');
        Route::get('files/{id}', 'MediaController@getFile');
        Route::put('files/{id}', 'MediaController@updateFile');
        Route::post('upload', 'MediaController@upload');
        Route::post('files/bulk-move', 'MediaController@bulkMoveFiles');
        Route::delete('files/bulk-delete', 'MediaController@bulkDelete');
    });

    // --- Module: PRODUCT CATALOG ---
    Route::group(['prefix' => 'catalog'], function () {
        // Specific routes must come BEFORE apiResource to avoid route matching conflicts
        Route::get('categories/dropdown', 'CategoryController@dropdown');
        Route::get('helpers/categories/tree', 'CategoryController@treeStructure');
        Route::get('brands/dropdown', 'BrandController@dropdown');
        Route::post('products/{id}/duplicate', 'ProductController@duplicate');
        Route::patch('products/{id}/status', 'ProductController@updateStatus');
        Route::post('products/{id}/variants', 'ProductController@storeVariant');
        Route::get('variants/{id}/channel-prices', 'PricingController@getChannelPrices');
        Route::post('variants/{id}/channel-prices', 'PricingController@setChannelPrice');
        Route::post('pricing/update', 'ProductPricingController@updatePrices');

        Route::apiResource('categories', 'CategoryController');
        Route::apiResource('brands', 'BrandController');
        Route::apiResource('attributes', 'AttributeController');
        Route::apiResource('products', 'ProductController');

        // Discount/Coupon custom routes (must come BEFORE apiResource)
        Route::post('discounts/bulk-generate', 'DiscountController@bulkGenerate');
        Route::post('discounts/check-validity', 'DiscountController@checkValidity');
        Route::post('discounts/{id}/toggle-status', 'DiscountController@toggleStatus');
        Route::apiResource('discounts', 'DiscountController');
    });

    // --- Module: INVENTORY ---
    Route::group(['prefix' => 'inventory'], function () {
        Route::apiResource('warehouses', 'WarehouseController');
        Route::get('current-stock', 'InventoryController@index');
        Route::get('low-stock', 'InventoryController@lowStockReport');
        Route::get('ledger', 'InventoryController@ledgerReport');
        Route::get('unsorted', 'InventorySortingController@getUnsortedBatches');
        Route::post('sort', 'InventorySortingController@sortStock');
        Route::apiResource('adjustments', 'AdjustmentController');
    });

    // --- Module: SALES & POS ---
    Route::group(['prefix' => 'sales'], function () {
        Route::apiResource('customers', 'CustomerController', ['names' => 'sales.customers']);
        Route::get('customers/{id}/orders', 'CustomerController@orderHistory');
        Route::group(['prefix' => 'pos'], function() {
            Route::get('products', 'PosController@getProducts');
            Route::post('scan', 'PosController@scanBarcode');
            Route::post('checkout', 'PosController@checkout');
        });
        Route::post('orders/create', 'SalesOrderController@store');
        Route::apiResource('orders', 'OrderController');
        Route::post('orders/{id}/status', 'OrderController@updateStatus');
        Route::post('orders/{id}/courier-push', 'OrderController@sendToCourier');
        Route::post('returns', 'ReturnController@store');
    });

    // --- Module: LOGISTICS ---
    Route::group(['prefix' => 'logistics'], function () {
        Route::apiResource('shipments', 'ShipmentController');
        Route::group(['prefix' => 'workflow'], function() {
            Route::post('draft', 'ShipmentWorkflowController@createDraft');
            Route::post('{id}/update-step', 'ShipmentWorkflowController@updateStep');
            Route::post('{id}/receive', 'ShipmentWorkflowController@receiveAtBogura');
        });
        Route::apiResource('couriers', 'CourierController');
        Route::post('courier/book/{order_id}', 'CourierController@bookOrder');
    });

    // --- Module: HRM & PAYROLL ---
    Route::group(['prefix' => 'hrm'], function() {
        // HRM Controllers
        Route::group(['namespace' => 'Hrm'], function() {
            Route::get('stats', 'StaffController@getStats');
            Route::apiResource('departments', 'DepartmentController');
            Route::apiResource('staff', 'StaffController');
            Route::post('staff/{id}/change-password', 'StaffController@changePassword');
            Route::post('staff/{id}/send-password-sms', 'StaffController@sendPasswordSms');
            Route::apiResource('leaves', 'LeaveController');
            // Attendance routes
            Route::get('attendance', 'AttendanceController@index');
            Route::get('attendance/my-status', 'AttendanceController@myStatus');
            Route::post('attendance', 'AttendanceController@store');
            Route::post('clock-in', 'AttendanceController@clockIn');
            Route::post('clock-out', 'AttendanceController@clockOut');
            Route::post('break-in', 'AttendanceController@breakIn');
            Route::post('break-out', 'AttendanceController@breakOut');
            Route::get('payrolls', 'PayrollController@index');
            Route::post('payrolls/generate', 'PayrollController@generate');
            Route::put('payrolls/{id}', 'PayrollController@update');
            Route::post('payrolls/{id}/pay', 'PayrollController@pay');
            Route::post('payrolls/process-sheet', 'PayrollController@processSalarySheet');
            Route::post('payrolls/confirm-payment', 'PayrollController@confirmPayment');
        });

        // System Controllers (Roles & Permissions)
        // Custom routes must come before apiResource to avoid conflicts
        Route::get('roles/trashed', 'RoleController@trashed');
        Route::post('roles/{id}/restore', 'RoleController@restore');
        Route::delete('roles/{id}/force-delete', 'RoleController@forceDelete');
        Route::get('roles/{id}/permissions', 'RoleController@getPermissions');
        Route::post('roles/{id}/sync-permissions', 'RoleController@syncPermissions');
        Route::apiResource('roles', 'RoleController');
        Route::post('permissions', 'PermissionController@store');
        Route::get('permissions', 'PermissionController@list');
        Route::get('permissions/grouped', 'PermissionController@grouped');
    });

    // --- Module: CRM ---
    Route::group(['prefix' => 'crm', 'namespace' => 'Crm'], function() {
        Route::get('stats', 'LeadController@getStats');
        Route::apiResource('leads', 'LeadController');
        Route::apiResource('customers', 'CustomerController', ['names' => 'crm.customers']);
        Route::post('customers/{id}/send-password-sms', 'CustomerController@sendPasswordSms');
        Route::post('activities', 'ActivityController@store');
        Route::post('activities/{id}/done', 'ActivityController@markAsDone');
        Route::post('segments/auto-run', 'CampaignController@runAutoSegmentation');
        Route::post('campaigns', 'CampaignController@store');
        Route::get('campaigns/{id}/generate-pdf', 'CampaignController@generatePdf');
    });

    // --- Module: WALLET ---
    Route::group(['prefix' => 'wallet'], function() {
        Route::get('/', 'WalletController@index');
        Route::get('/stats', 'WalletController@stats');
        Route::get('/transactions', 'WalletController@transactions');
        Route::get('/{id}', 'WalletController@show');
        Route::post('/add-funds', 'WalletController@addFunds');
        Route::post('/deduct-funds', 'WalletController@deductFunds');
        Route::post('/{id}/toggle-freeze', 'WalletController@toggleFreeze');
    });

    // --- Module: FINANCE ---
    Route::group(['prefix' => 'finance'], function () {
        // Finance Dashboard
        Route::get('dashboard', 'FinanceController@dashboard');

        // Chart of Accounts - Specific routes BEFORE apiResource
        Route::get('accounts/summary', 'AccountController@balanceSummary');
        Route::get('accounts/trial-balance', 'AccountController@trialBalance');
        Route::get('accounts/statistics', 'AccountController@statistics');
        Route::apiResource('accounts', 'AccountController');

        // Bank Accounts - Specific routes BEFORE apiResource
        Route::get('banks/summary', 'BankController@summary');
        Route::get('payment-accounts', 'BankController@getPaymentAccounts');
        Route::apiResource('banks', 'BankController');
        Route::get('banks/{id}/transactions', 'BankController@transactions');
        Route::post('banks/{id}/deposit', 'BankController@deposit');
        Route::post('banks/{id}/withdraw', 'BankController@withdraw');
        Route::post('banks/transfer', 'BankController@transfer');

        // Bank Transactions
        Route::get('bank-transactions', 'BankTransactionController@index');
        Route::get('bank-transactions/statistics', 'BankTransactionController@statistics');
        Route::get('bank-transactions/{id}', 'BankTransactionController@show');

        // Unified Transactions (bank + expenses)
        Route::get('transactions', 'TransactionController@index');
        Route::get('transactions/statistics', 'TransactionController@statistics');

        // Expenses
        Route::apiResource('expenses', 'ExpenseController');
        Route::post('expenses/{id}/approve', 'ExpenseController@approve');

        // Financial Reports
        Route::prefix('reports')->group(function () {
            Route::get('profit-loss', 'ReportController@profitLoss');
            Route::get('balance-sheet', 'ReportController@balanceSheet');
            Route::get('cash-flow', 'ReportController@cashFlow');
            Route::get('trial-balance', 'ReportController@trialBalance');
            Route::get('general-ledger', 'ReportController@generalLedger');
        });

        // Bank Reconciliations
        Route::apiResource('bank-reconciliations', 'BankReconciliationController');
        Route::post('bank-reconciliations/{id}/reconcile', 'BankReconciliationController@reconcile');
        Route::post('bank-reconciliations/{id}/reset', 'BankReconciliationController@reset');
        Route::get('bank-reconciliations/book-balance/{bankId}', 'BankReconciliationController@getBookBalance');
        Route::get('bank-reconciliations/pending-transactions/{bankId}', 'BankReconciliationController@getPendingTransactions');
        Route::get('bank-reconciliations/summary', 'BankReconciliationController@summary');

        // Fixed Assets
        Route::get('fixed-assets/summary', 'FixedAssetController@summary');
        Route::get('fixed-assets/categories', 'FixedAssetController@getCategories');
        Route::get('fixed-assets/locations', 'FixedAssetController@getLocations');
        Route::post('fixed-assets/update-depreciation', 'FixedAssetController@updateDepreciationAll');
        Route::apiResource('fixed-assets', 'FixedAssetController');
        Route::post('fixed-assets/{id}/dispose', 'FixedAssetController@dispose');

        // Cheque/PDC Management
        Route::get('cheques/summary', 'ChequeController@summary');
        Route::get('cheques/alerts', 'ChequeController@alerts');
        Route::apiResource('cheques', 'ChequeController');
        Route::post('cheques/{id}/deposit', 'ChequeController@deposit');
        Route::post('cheques/{id}/clear', 'ChequeController@clear');
        Route::post('cheques/{id}/bounce', 'ChequeController@bounce');
        Route::post('cheques/{id}/cancel', 'ChequeController@cancel');

        // Currencies
        Route::get('currencies/default', 'CurrencyController@getDefault');
        Route::post('currencies/convert', 'CurrencyController@convert');
        Route::apiResource('currencies', 'CurrencyController');
        Route::post('currencies/{id}/exchange-rate', 'CurrencyController@updateExchangeRate');

        // VAT/Tax Ledger
        Route::apiResource('vat-tax-ledgers', 'VatTaxLedgerController');
        Route::post('vat-tax-ledgers/{id}/mark-paid', 'VatTaxLedgerController@markAsPaid');
        Route::post('vat-tax-ledgers/{id}/mark-filed', 'VatTaxLedgerController@markAsFiled');
        Route::get('vat-tax-ledgers/summary', 'VatTaxLedgerController@summary');
        Route::get('vat-tax-ledgers/net-calculation', 'VatTaxLedgerController@netCalculation');
        Route::get('vat-tax-ledgers/by-period', 'VatTaxLedgerController@byPeriod');

        // Journal Entries
        Route::get('journal-entries/next-number', 'JournalEntryController@getNextNumber');
        Route::get('journal-entries/statistics', 'JournalEntryController@statistics');
        Route::get('journal-entries/by-account', 'JournalEntryController@byAccount');
        Route::apiResource('journal-entries', 'JournalEntryController');
        Route::post('journal-entries/{id}/reverse', 'JournalEntryController@reverse');

        // Budgets - Specific routes must come BEFORE apiResource
        Route::get('budgets/variance-report', 'BudgetController@varianceReport');
        Route::get('budgets/statistics', 'BudgetController@statistics');
        Route::apiResource('budgets', 'BudgetController');
        Route::post('budgets/{id}/approve', 'BudgetController@approve');
        Route::put('budgets/{id}/actual', 'BudgetController@updateActual');

        // Cost Centers
        Route::apiResource('cost-centers', 'CostCenterController');
        Route::post('cost-centers/{id}/allocate-budget', 'CostCenterController@allocateBudget');
        Route::post('cost-centers/{id}/recalculate-budget', 'CostCenterController@recalculateBudget');
        Route::get('cost-centers/{id}/expenses', 'CostCenterController@expenses');
        Route::get('cost-centers/statistics', 'CostCenterController@statistics');
        Route::get('cost-centers/next-code', 'CostCenterController@getNextCode');

        // Projects
        Route::apiResource('projects', 'ProjectController');
        Route::post('projects/{id}/calculate-profitability', 'ProjectController@calculateProfitability');
        Route::put('projects/{id}/update-progress', 'ProjectController@updateProgress');
        Route::get('projects/{id}/expenses', 'ProjectController@expenses');
        Route::get('projects/statistics', 'ProjectController@statistics');
        Route::get('projects/next-code', 'ProjectController@getNextCode');

        // Fiscal Years
        Route::apiResource('fiscal-years', 'FiscalYearController');
        Route::post('fiscal-years/{id}/close', 'FiscalYearController@close');
        Route::post('fiscal-years/{id}/reopen', 'FiscalYearController@reopen');
        Route::get('fiscal-years/{id}/summary', 'FiscalYearController@summary');
        Route::get('fiscal-years/current', 'FiscalYearController@getCurrent');
        Route::get('fiscal-years/statistics', 'FiscalYearController@statistics');
        Route::get('fiscal-years/check-date', 'FiscalYearController@checkDate');

        // Accounts Payable (Vendor Bills) - Specific routes must come BEFORE apiResource
        Route::get('accounts-payable/aging-report', 'AccountsPayableController@agingReport');
        Route::get('accounts-payable/payments', 'AccountsPayableController@payments');
        Route::get('accounts-payable/statistics', 'AccountsPayableController@statistics');
        Route::apiResource('accounts-payable', 'AccountsPayableController');
        Route::post('accounts-payable/payments', 'AccountsPayableController@storePayment');

        // Accounts Receivable (Customer Invoices) - Specific routes must come BEFORE apiResource
        Route::get('accounts-receivable/aging-report', 'AccountsReceivableController@agingReport');
        Route::get('accounts-receivable/payments', 'AccountsReceivableController@payments');
        Route::get('accounts-receivable/statistics', 'AccountsReceivableController@statistics');
        Route::apiResource('accounts-receivable', 'AccountsReceivableController');
        Route::post('accounts-receivable/payments', 'AccountsReceivableController@storePayment');

        // Advanced Financial Reports
        Route::prefix('reports')->group(function () {
            Route::get('/', 'FinancialReportController@index');
            Route::post('/', 'FinancialReportController@store');
            Route::get('/statistics', 'FinancialReportController@statistics');
            Route::get('/templates', 'FinancialReportController@templates');
            Route::get('/{id}', 'FinancialReportController@show');
            Route::put('/{id}', 'FinancialReportController@update');
            Route::delete('/{id}', 'FinancialReportController@destroy');
            Route::post('/{id}/generate', 'FinancialReportController@generate');
            Route::get('/{id}/export', 'FinancialReportController@export');
        });

        // Audit Trail
        Route::prefix('audit')->group(function () {
            Route::get('/', 'AuditController@index');
            Route::get('/statistics', 'AuditController@statistics');
            Route::get('/history', 'AuditController@history');
            Route::get('/timeline', 'AuditController@timeline');
            Route::get('/{id}', 'AuditController@show');
            Route::post('/{id}/documents', 'AuditController@uploadDocument');
            Route::get('/documents/{id}/download', 'AuditController@downloadDocument');
            Route::get('/documents/entity', 'AuditController@entityDocuments');
        });
    });

    // --- Module: CMS & SUPPORT ---
    Route::group(['prefix' => 'cms'], function () {
        Route::apiResource('support-tickets', 'TicketController');
        Route::apiResource('landing-pages', 'LandingPageController');
        Route::apiResource('menus', 'MenuController');
        Route::post('payment/bkash/init/{order_id}', 'PaymentController@payWithBkash');
    });

    // --- Module: PROCUREMENT ---
    Route::group(['prefix' => 'procurement'], function () {
        // Statistics - must come before apiResource
        Route::get('statistics', 'ProcurementController@statistics');
        Route::get('suppliers/{id}/products', 'ProcurementController@getBySupplier');
        Route::patch('products/{id}/status', 'ProcurementController@updateStatus');
        Route::apiResource('products', 'ProcurementController');

        // Purchase Orders
        Route::get('orders/statistics', 'PurchaseOrderController@statistics');
        Route::patch('orders/{id}/status', 'PurchaseOrderController@updateStatus');
        Route::post('orders/{id}/approve-and-stock', 'PurchaseOrderController@approveAndStock');
        Route::patch('orders/{poId}/status-history/{historyId}/comments', 'PurchaseOrderController@updateStatusHistoryComments');
        Route::patch('orders/{poId}/status-history/{historyId}/timeline-data', 'PurchaseOrderController@updateStatusHistoryTimelineData');
        Route::apiResource('orders', 'PurchaseOrderController');
    });

    // --- Others ---
    Route::get('loyalty-rules', 'LoyaltyController@index');
    Route::apiResource('affiliates', 'AffiliateController');

});

// ====================================================
// MODULE: AUDIT LOGS (Admin Control)
// ====================================================
Route::group([
    'prefix' => 'v2/admin',
    'namespace' => 'App\Http\Controllers\Api\V2',
    'middleware' => ['auth']
], function () {
    Route::get('audit-logs', 'AuditController@index');
    Route::get('audit-logs/{fileName}/preview', 'AuditController@preview');
    Route::get('audit-logs/{fileName}/download', 'AuditController@download');
    Route::delete('audit-logs/{fileName}', 'AuditController@destroy');
});

// ====================================================
// MODULE: PUBLIC (Guest Access)
// ====================================================
Route::group([
    'prefix' => 'v2/public',
    'namespace' => 'App\Http\Controllers\Api\V2'
], function () {
    Route::get('products', 'PublicController@productList');
    Route::get('products/{slug}', 'PublicController@productDetail');
    Route::get('categories', 'PublicController@categories');
    Route::post('crm/leads/checkout-capture', 'Crm\LeadController@captureCheckoutLead');
    Route::post('contact/submit', 'Crm\LeadController@contactSubmit');
});

// ====================================================
// MODULE: WEBSITE ADMIN (Storefront Management)
// ====================================================
Route::group([
    'prefix' => 'v2/website-admin',
    'namespace' => 'App\Http\Controllers\Api\V2\WebsiteAdmin',
    'middleware' => ['auth'],
], function () {
    // Order Statistics
    Route::get('orders/statistics', 'OrderController@statistics');

    // Product Search (for adding items)
    Route::get('products/search', 'OrderController@searchProducts');
    Route::get('products/search-products', 'OrderController@searchProductsGrouped');
    Route::get('products/top-selling', 'OrderController@topSellingProducts');

    // Product Variants (for changing variant on an item)
    Route::get('products/{id}/variants', 'OrderController@productVariants');

    // Delivery Charge Calculator
    Route::post('orders/calculate-delivery', 'OrderController@calculateDeliveryCharge');

    // Order CRUD
    Route::get('orders', 'OrderController@index');
    Route::get('orders/{id}', 'OrderController@show');
    Route::put('orders/{id}', 'OrderController@update');

    // Order Status
    Route::put('orders/{id}/status', 'OrderController@updateStatus');
    Route::get('orders/{id}/status-history', 'OrderController@statusHistory');

    // Payment
    Route::put('orders/{id}/payment', 'OrderController@updatePayment');

    // Item Management
    Route::post('orders/{id}/items', 'OrderController@addItem');
    Route::put('orders/{orderId}/items/{itemId}', 'OrderController@updateItem');
    Route::delete('orders/{orderId}/items/{itemId}', 'OrderController@removeItem');

    // Courier (Steadfast)
    Route::post('orders/{id}/send-to-courier', 'OrderController@sendToCourier');
    Route::post('orders/{id}/sync-courier', 'OrderController@syncCourierStatus');

    // Activity Log
    Route::get('orders/{id}/activity-log', 'OrderController@activityLog');

    // SMS
    Route::post('orders/{id}/send-sms', 'OrderController@sendSms');

    // Sliders (Module Slider)
    Route::post('sliders/reorder', 'SliderController@reorder');
    Route::apiResource('sliders', 'SliderController');
});
