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
    Route::group(['prefix' => 'system', 'middleware' => 'permission:system.settings.index'], function () {
        Route::apiResource('units', 'UnitController')
            ->middleware([
                'store' => 'permission:system.settings.create',
                'update' => 'permission:system.settings.edit',
                'destroy' => 'permission:system.settings.delete',
            ]);
        Route::get('units/dropdown', 'UnitController@dropdown');
        Route::get('helpers/units', 'UnitController@dropdown');
        Route::apiResource('settings', 'SettingController')
            ->middleware([
                'store' => 'permission:system.settings.create',
                'update' => 'permission:system.settings.edit',
                'destroy' => 'permission:system.settings.delete',
            ]);
        Route::post('settings/update', 'SettingController@update')
            ->middleware('permission:system.settings.edit');

        // System optimization endpoint (admin only, inside auth middleware)
        Route::get('optimize', 'System\OptimizeInvokeController');
    });

    Route::group(['prefix' => 'user-management', 'middleware' => 'permission:user-management.users.index'], function () {
        Route::get('users', 'UserController@index');
        Route::post('users', 'UserController@store')->middleware('permission:user-management.users.create');
        Route::get('users/{id}', 'UserController@show');
        Route::post('users/{id}/ban', 'UserController@banUser')->middleware('permission:user-management.users.edit');
        Route::post('users/{id}/restore', 'UserController@restore')->middleware('permission:user-management.users.edit');
        Route::post('users/{id}/direct-permissions', 'UserController@giveDirectPermission')->middleware('permission:user-management.users.edit');
        Route::delete('users/{id}', 'UserController@destroy')->middleware('permission:user-management.users.delete');
        Route::put('users/{id}', 'UserController@update')->middleware('permission:user-management.users.edit');
        Route::post('users/{id}/block-permission', 'UserController@blockPermission')->middleware('permission:user-management.users.edit');
        Route::put('users/{id}/permissions/granted', 'UserController@syncGrantedPermissions')->middleware('permission:user-management.users.edit');
        Route::put('users/{id}/permissions/blocked', 'UserController@syncBlockedPermissions')->middleware('permission:user-management.users.edit');
        Route::get('roles', 'UserController@roleList');
        Route::get('permissions', 'PermissionController@list');
        Route::apiResource('suppliers', 'SupplierController')
            ->middleware([
                'store' => 'permission:user-management.suppliers.create',
                'update' => 'permission:user-management.suppliers.edit',
                'destroy' => 'permission:user-management.suppliers.delete',
            ]);
    });

    // --- Module: MEDIA ASSETS ---
    Route::group(['prefix' => 'media', 'middleware' => 'permission:cms.media.view'], function () {
        // Folders
        Route::get('folders', 'MediaController@getFolders');
        Route::post('folders', 'MediaController@createFolder')->middleware('permission:cms.media.folders.create');
        Route::put('folders/{id}', 'MediaController@updateFolder')->middleware('permission:cms.media.folders.edit');
        Route::delete('folders/{id}', 'MediaController@deleteFolder')->middleware('permission:cms.media.folders.delete');

        // Files
        Route::get('files', 'MediaController@getFiles');
        Route::get('files/{id}', 'MediaController@getFile');
        Route::put('files/{id}', 'MediaController@updateFile');
        Route::post('upload', 'MediaController@upload')->middleware('permission:cms.media.files.upload');
        Route::post('files/bulk-move', 'MediaController@bulkMoveFiles')->middleware('permission:cms.media.files.move');
        Route::delete('files/bulk-delete', 'MediaController@bulkDelete')->middleware('permission:cms.media.files.delete');
    });

    // --- Module: PRODUCT CATALOG ---
    Route::group(['prefix' => 'catalog', 'middleware' => 'permission:catalog.products.index'], function () {
        // Specific routes must come BEFORE apiResource to avoid route matching conflicts
        Route::get('categories/dropdown', 'CategoryController@dropdown');
        Route::get('helpers/categories/tree', 'CategoryController@treeStructure');
        Route::get('brands/dropdown', 'BrandController@dropdown');
        Route::post('products/{id}/duplicate', 'ProductController@duplicate')->middleware('permission:catalog.products.duplicate');
        Route::patch('products/{id}/status', 'ProductController@updateStatus')->middleware('permission:catalog.products.status');
        Route::post('products/{id}/variants', 'ProductController@storeVariant')->middleware('permission:catalog.products.variants.create');
        Route::get('variants/{id}/channel-prices', 'PricingController@getChannelPrices');
        Route::post('variants/{id}/channel-prices', 'PricingController@setChannelPrice')->middleware('permission:catalog.pricing.channel-price');
        Route::post('pricing/update', 'ProductPricingController@updatePrices')->middleware('permission:catalog.pricing.update');

        Route::apiResource('categories', 'CategoryController')
            ->middleware([
                'store' => 'permission:catalog.categories.create',
                'update' => 'permission:catalog.categories.edit',
                'destroy' => 'permission:catalog.categories.delete',
            ]);
        Route::apiResource('brands', 'BrandController')
            ->middleware([
                'store' => 'permission:catalog.brands.create',
                'update' => 'permission:catalog.brands.edit',
                'destroy' => 'permission:catalog.brands.delete',
            ]);
        Route::apiResource('attributes', 'AttributeController')
            ->middleware([
                'store' => 'permission:catalog.attributes.create',
                'update' => 'permission:catalog.attributes.edit',
                'destroy' => 'permission:catalog.attributes.delete',
            ]);
        Route::apiResource('products', 'ProductController')
            ->middleware([
                'store' => 'permission:catalog.products.create',
                'update' => 'permission:catalog.products.edit',
                'destroy' => 'permission:catalog.products.delete',
            ]);

        // Discount/Coupon custom routes (must come BEFORE apiResource)
        Route::post('discounts/bulk-generate', 'DiscountController@bulkGenerate')->middleware('permission:catalog.discounts.bulk-generate');
        Route::post('discounts/check-validity', 'DiscountController@checkValidity')->middleware('permission:catalog.discounts.check-validity');
        Route::post('discounts/{id}/toggle-status', 'DiscountController@toggleStatus')->middleware('permission:catalog.discounts.toggle-status');
        Route::apiResource('discounts', 'DiscountController')
            ->middleware([
                'store' => 'permission:catalog.discounts.create',
                'update' => 'permission:catalog.discounts.edit',
                'destroy' => 'permission:catalog.discounts.delete',
            ]);
    });

    // --- Module: INVENTORY ---
    Route::group(['prefix' => 'inventory', 'middleware' => 'permission:inventory.warehouses.index'], function () {
        Route::apiResource('warehouses', 'WarehouseController')
            ->middleware([
                'store' => 'permission:inventory.warehouses.create',
                'update' => 'permission:inventory.warehouses.edit',
                'destroy' => 'permission:inventory.warehouses.delete',
            ]);
        Route::get('current-stock', 'InventoryController@index');
        Route::get('low-stock', 'InventoryController@lowStockReport')->middleware('permission:inventory.stock.low-stock');
        Route::get('ledger', 'InventoryController@ledgerReport')->middleware('permission:inventory.stock.ledger');
        Route::get('unsorted', 'InventorySortingController@getUnsortedBatches')->middleware('permission:inventory.sorting.index');
        Route::post('sort', 'InventorySortingController@sortStock')->middleware('permission:inventory.sorting.sort');
        Route::apiResource('adjustments', 'AdjustmentController')
            ->middleware([
                'store' => 'permission:inventory.adjustments.create',
                'update' => 'permission:inventory.adjustments.edit',
                'destroy' => 'permission:inventory.adjustments.delete',
            ]);
    });

    // --- Module: SALES & POS ---
    Route::group(['prefix' => 'sales', 'middleware' => 'permission:sales.customers.index'], function () {
        Route::apiResource('customers', 'CustomerController', ['names' => 'sales.customers'])
            ->middleware([
                'store' => 'permission:sales.customers.create',
                'update' => 'permission:sales.customers.edit',
                'destroy' => 'permission:sales.customers.delete',
            ]);
        Route::get('customers/{id}/orders', 'CustomerController@orderHistory')->middleware('permission:sales.customers.order-history');
        Route::group(['prefix' => 'pos', 'middleware' => 'permission:sales.pos.view'], function() {
            Route::get('products', 'PosController@getProducts');
            Route::post('scan', 'PosController@scanBarcode')->middleware('permission:sales.pos.scan');
            Route::post('checkout', 'PosController@checkout')->middleware('permission:sales.pos.checkout');
        });
        Route::post('orders/create', 'SalesOrderController@store')->middleware('permission:sales.orders.create');
        Route::apiResource('orders', 'OrderController')
            ->middleware([
                'store' => 'permission:sales.orders.create',
                'update' => 'permission:sales.orders.edit',
                'destroy' => 'permission:sales.orders.delete',
            ]);
        Route::post('orders/{id}/status', 'OrderController@updateStatus')->middleware('permission:sales.orders.status');
        Route::post('orders/{id}/courier-push', 'OrderController@sendToCourier')->middleware('permission:sales.orders.courier-push');
        Route::post('returns', 'ReturnController@store')->middleware('permission:sales.returns.create');
    });

    // --- Module: LOGISTICS ---
    Route::group(['prefix' => 'logistics', 'middleware' => 'permission:logistics.shipments.index'], function () {
        Route::apiResource('shipments', 'ShipmentController')
            ->middleware([
                'store' => 'permission:logistics.shipments.create',
                'update' => 'permission:logistics.shipments.edit',
                'destroy' => 'permission:logistics.shipments.delete',
            ]);
        Route::group(['prefix' => 'workflow'], function() {
            Route::post('draft', 'ShipmentWorkflowController@createDraft')->middleware('permission:logistics.shipments.draft');
            Route::post('{id}/update-step', 'ShipmentWorkflowController@updateStep')->middleware('permission:logistics.shipments.update-step');
            Route::post('{id}/receive', 'ShipmentWorkflowController@receiveAtBogura')->middleware('permission:logistics.shipments.receive');
        });
        Route::apiResource('couriers', 'CourierController')
            ->middleware([
                'store' => 'permission:logistics.couriers.create',
                'update' => 'permission:logistics.couriers.edit',
                'destroy' => 'permission:logistics.couriers.delete',
            ]);
        Route::post('courier/book/{order_id}', 'CourierController@bookOrder')->middleware('permission:logistics.couriers.book');
    });

    // --- Module: HRM & PAYROLL ---
    Route::group(['prefix' => 'hrm', 'middleware' => 'permission:hrm.staff.index'], function() {
        // HRM Controllers
        Route::group(['namespace' => 'Hrm'], function() {
            Route::get('stats', 'StaffController@getStats')->middleware('permission:hrm.staff.stats');
            Route::apiResource('departments', 'DepartmentController')
                ->middleware([
                    'store' => 'permission:hrm.department.create',
                    'update' => 'permission:hrm.department.edit',
                    'destroy' => 'permission:hrm.department.delete',
                ]);
            Route::apiResource('staff', 'StaffController')
                ->middleware([
                    'store' => 'permission:hrm.staff.create',
                    'update' => 'permission:hrm.staff.edit',
                    'destroy' => 'permission:hrm.staff.delete',
                ]);
            Route::post('staff/{id}/change-password', 'StaffController@changePassword')->middleware('permission:hrm.staff.change-password');
            Route::post('staff/{id}/send-password-sms', 'StaffController@sendPasswordSms')->middleware('permission:hrm.staff.send-password-sms');
            Route::apiResource('leaves', 'LeaveController')
                ->middleware([
                    'store' => 'permission:hrm.leave.create',
                ]);
            // Attendance routes
            Route::get('attendance', 'AttendanceController@index');
            Route::get('attendance/my-status', 'AttendanceController@myStatus')->middleware('permission:hrm.attendance.my-status');
            Route::post('attendance', 'AttendanceController@store')->middleware('permission:hrm.attendance.create');
            Route::post('clock-in', 'AttendanceController@clockIn')->middleware('permission:hrm.attendance.clock-in');
            Route::post('clock-out', 'AttendanceController@clockOut')->middleware('permission:hrm.attendance.clock-out');
            Route::post('break-in', 'AttendanceController@breakIn')->middleware('permission:hrm.attendance.break-in');
            Route::post('break-out', 'AttendanceController@breakOut')->middleware('permission:hrm.attendance.break-out');
            // Payroll routes
            Route::get('payrolls', 'PayrollController@index');
            Route::post('payrolls/generate', 'PayrollController@generate')->middleware('permission:hrm.payroll.generate');
            Route::put('payrolls/{id}', 'PayrollController@update')->middleware('permission:hrm.payroll.edit');
            Route::post('payrolls/{id}/pay', 'PayrollController@pay')->middleware('permission:hrm.payroll.pay');
            Route::post('payrolls/process-sheet', 'PayrollController@processSalarySheet')->middleware('permission:hrm.payroll.process-sheet');
            Route::post('payrolls/confirm-payment', 'PayrollController@confirmPayment')->middleware('permission:hrm.payroll.confirm-payment');
        });

        // System Controllers (Roles & Permissions)
        // Custom routes must come before apiResource to avoid conflicts
        Route::get('roles/trashed', 'RoleController@trashed')->middleware('permission:hrm.role.index');
        Route::post('roles/{id}/restore', 'RoleController@restore')->middleware('permission:hrm.role.restore');
        Route::delete('roles/{id}/force-delete', 'RoleController@forceDelete')->middleware('permission:hrm.role.force-delete');
        Route::get('roles/{id}/permissions', 'RoleController@getPermissions')->middleware('permission:hrm.role.view-permissions');
        Route::post('roles/{id}/sync-permissions', 'RoleController@syncPermissions')->middleware('permission:hrm.role.sync-permissions');
        Route::apiResource('roles', 'RoleController')
            ->middleware([
                'store' => 'permission:hrm.role.create',
                'update' => 'permission:hrm.role.edit',
                'destroy' => 'permission:hrm.role.delete',
            ]);
        Route::post('permissions', 'PermissionController@store')->middleware('permission:hrm.role.sync-permissions');
        Route::get('permissions', 'PermissionController@list');
        Route::get('permissions/grouped', 'PermissionController@grouped');
    });

    // --- Module: CRM ---
    Route::group(['prefix' => 'crm', 'namespace' => 'Crm', 'middleware' => 'permission:crm.leads.index'], function() {
        Route::get('stats', 'LeadController@getStats');
        Route::apiResource('leads', 'LeadController')
            ->middleware([
                'store' => 'permission:crm.leads.create',
                'update' => 'permission:crm.leads.edit',
                'destroy' => 'permission:crm.leads.delete',
            ]);
        Route::apiResource('customers', 'CustomerController', ['names' => 'crm.customers'])
            ->middleware([
                'store' => 'permission:crm.customers.create',
                'update' => 'permission:crm.customers.edit',
                'destroy' => 'permission:crm.customers.delete',
            ]);
        Route::post('customers/{id}/send-password-sms', 'CustomerController@sendPasswordSms')->middleware('permission:crm.customers.edit');
        Route::post('activities', 'ActivityController@store')->middleware('permission:crm.activities.create');
        Route::post('activities/{id}/done', 'ActivityController@markAsDone')->middleware('permission:crm.activities.complete');
        Route::post('segments/auto-run', 'CampaignController@runAutoSegmentation')->middleware('permission:crm.segments.edit');
        Route::post('campaigns', 'CampaignController@store')->middleware('permission:crm.campaigns.create');
        Route::get('campaigns/{id}/generate-pdf', 'CampaignController@generatePdf')->middleware('permission:crm.campaigns.launch');
    });

    // --- Module: WALLET ---
    Route::group(['prefix' => 'wallet', 'middleware' => 'permission:crm.wallet.index'], function() {
        Route::get('/', 'WalletController@index');
        Route::get('/stats', 'WalletController@stats')->middleware('permission:crm.wallet.stats');
        Route::get('/transactions', 'WalletController@transactions')->middleware('permission:crm.wallet.transactions');
        Route::get('/{id}', 'WalletController@show');
        Route::post('/add-funds', 'WalletController@addFunds')->middleware('permission:crm.wallet.add');
        Route::post('/deduct-funds', 'WalletController@deductFunds')->middleware('permission:crm.wallet.deduct');
        Route::post('/{id}/toggle-freeze', 'WalletController@toggleFreeze')->middleware('permission:crm.wallet.toggle-freeze');
    });

    // --- Module: FINANCE ---
    Route::group(['prefix' => 'finance', 'middleware' => 'permission:finance.dashboard.index'], function () {
        // Finance Dashboard
        Route::get('dashboard', 'FinanceController@dashboard');

        // Chart of Accounts - Specific routes BEFORE apiResource
        Route::get('accounts/summary', 'AccountController@balanceSummary');
        Route::get('accounts/trial-balance', 'AccountController@trialBalance');
        Route::get('accounts/statistics', 'AccountController@statistics');
        Route::apiResource('accounts', 'AccountController')
            ->middleware([
                'store' => 'permission:finance.accounts.create',
                'update' => 'permission:finance.accounts.edit',
                'destroy' => 'permission:finance.accounts.delete',
            ]);

        // Bank Accounts - Specific routes BEFORE apiResource
        Route::get('banks/summary', 'BankController@summary');
        Route::get('payment-accounts', 'BankController@getPaymentAccounts');
        Route::apiResource('banks', 'BankController')
            ->middleware([
                'store' => 'permission:finance.banks.create',
                'update' => 'permission:finance.banks.edit',
                'destroy' => 'permission:finance.banks.delete',
            ]);
        Route::get('banks/{id}/transactions', 'BankController@transactions')->middleware('permission:finance.banks.transactions');
        Route::post('banks/{id}/deposit', 'BankController@deposit')->middleware('permission:finance.banks.deposit');
        Route::post('banks/{id}/withdraw', 'BankController@withdraw')->middleware('permission:finance.banks.withdraw');
        Route::post('banks/transfer', 'BankController@transfer')->middleware('permission:finance.banks.transfer');

        // Bank Transactions
        Route::get('bank-transactions', 'BankTransactionController@index');
        Route::get('bank-transactions/statistics', 'BankTransactionController@statistics');
        Route::get('bank-transactions/{id}', 'BankTransactionController@show');

        // Unified Transactions (bank + expenses)
        Route::get('transactions', 'TransactionController@index');
        Route::get('transactions/statistics', 'TransactionController@statistics');

        // Expenses
        Route::apiResource('expenses', 'ExpenseController')
            ->middleware([
                'store' => 'permission:finance.expenses.create',
                'update' => 'permission:finance.expenses.edit',
                'destroy' => 'permission:finance.expenses.delete',
            ]);
        Route::post('expenses/{id}/approve', 'ExpenseController@approve')->middleware('permission:finance.expenses.approve');

        // Financial Reports
        Route::prefix('reports')->middleware('permission:finance.reports.index')->group(function () {
            Route::get('profit-loss', 'ReportController@profitLoss');
            Route::get('balance-sheet', 'ReportController@balanceSheet');
            Route::get('cash-flow', 'ReportController@cashFlow');
            Route::get('trial-balance', 'ReportController@trialBalance');
            Route::get('general-ledger', 'ReportController@generalLedger');
        });

        // Bank Reconciliations
        Route::apiResource('bank-reconciliations', 'BankReconciliationController')
            ->middleware([
                'store' => 'permission:finance.reconciliations.create',
                'update' => 'permission:finance.reconciliations.edit',
                'destroy' => 'permission:finance.reconciliations.delete',
            ]);
        Route::post('bank-reconciliations/{id}/reconcile', 'BankReconciliationController@reconcile')->middleware('permission:finance.reconciliations.reconcile');
        Route::post('bank-reconciliations/{id}/reset', 'BankReconciliationController@reset')->middleware('permission:finance.reconciliations.reset');
        Route::get('bank-reconciliations/book-balance/{bankId}', 'BankReconciliationController@getBookBalance');
        Route::get('bank-reconciliations/pending-transactions/{bankId}', 'BankReconciliationController@getPendingTransactions');
        Route::get('bank-reconciliations/summary', 'BankReconciliationController@summary');

        // Fixed Assets
        Route::get('fixed-assets/summary', 'FixedAssetController@summary');
        Route::get('fixed-assets/categories', 'FixedAssetController@getCategories');
        Route::get('fixed-assets/locations', 'FixedAssetController@getLocations');
        Route::post('fixed-assets/update-depreciation', 'FixedAssetController@updateDepreciationAll')->middleware('permission:finance.fixed-assets.edit');
        Route::apiResource('fixed-assets', 'FixedAssetController')
            ->middleware([
                'store' => 'permission:finance.fixed-assets.create',
                'update' => 'permission:finance.fixed-assets.edit',
                'destroy' => 'permission:finance.fixed-assets.delete',
            ]);
        Route::post('fixed-assets/{id}/dispose', 'FixedAssetController@dispose')->middleware('permission:finance.fixed-assets.dispose');

        // Cheque/PDC Management
        Route::get('cheques/summary', 'ChequeController@summary');
        Route::get('cheques/alerts', 'ChequeController@alerts');
        Route::apiResource('cheques', 'ChequeController')
            ->middleware([
                'store' => 'permission:finance.cheques.create',
                'update' => 'permission:finance.cheques.edit',
                'destroy' => 'permission:finance.cheques.delete',
            ]);
        Route::post('cheques/{id}/deposit', 'ChequeController@deposit')->middleware('permission:finance.cheques.deposit');
        Route::post('cheques/{id}/clear', 'ChequeController@clear')->middleware('permission:finance.cheques.clear');
        Route::post('cheques/{id}/bounce', 'ChequeController@bounce')->middleware('permission:finance.cheques.bounce');
        Route::post('cheques/{id}/cancel', 'ChequeController@cancel')->middleware('permission:finance.cheques.cancel');

        // Currencies
        Route::get('currencies/default', 'CurrencyController@getDefault');
        Route::post('currencies/convert', 'CurrencyController@convert');
        Route::apiResource('currencies', 'CurrencyController')
            ->middleware([
                'store' => 'permission:finance.currencies.create',
                'update' => 'permission:finance.currencies.edit',
                'destroy' => 'permission:finance.currencies.delete',
            ]);
        Route::post('currencies/{id}/exchange-rate', 'CurrencyController@updateExchangeRate')->middleware('permission:finance.currencies.update-rate');

        // VAT/Tax Ledger
        Route::apiResource('vat-tax-ledgers', 'VatTaxLedgerController')
            ->middleware([
                'store' => 'permission:finance.vat-tax.create',
                'update' => 'permission:finance.vat-tax.edit',
                'destroy' => 'permission:finance.vat-tax.delete',
            ]);
        Route::post('vat-tax-ledgers/{id}/mark-paid', 'VatTaxLedgerController@markAsPaid')->middleware('permission:finance.vat-tax.mark-paid');
        Route::post('vat-tax-ledgers/{id}/mark-filed', 'VatTaxLedgerController@markAsFiled')->middleware('permission:finance.vat-tax.mark-filed');
        Route::get('vat-tax-ledgers/summary', 'VatTaxLedgerController@summary');
        Route::get('vat-tax-ledgers/net-calculation', 'VatTaxLedgerController@netCalculation');
        Route::get('vat-tax-ledgers/by-period', 'VatTaxLedgerController@byPeriod');

        // Journal Entries
        Route::get('journal-entries/next-number', 'JournalEntryController@getNextNumber');
        Route::get('journal-entries/statistics', 'JournalEntryController@statistics');
        Route::get('journal-entries/by-account', 'JournalEntryController@byAccount');
        Route::apiResource('journal-entries', 'JournalEntryController')
            ->middleware([
                'store' => 'permission:finance.journal-entries.create',
                'update' => 'permission:finance.journal-entries.edit',
                'destroy' => 'permission:finance.journal-entries.delete',
            ]);
        Route::post('journal-entries/{id}/reverse', 'JournalEntryController@reverse')->middleware('permission:finance.journal-entries.reverse');

        // Budgets - Specific routes must come BEFORE apiResource
        Route::get('budgets/variance-report', 'BudgetController@varianceReport');
        Route::get('budgets/statistics', 'BudgetController@statistics');
        Route::apiResource('budgets', 'BudgetController')
            ->middleware([
                'store' => 'permission:finance.budgets.create',
                'update' => 'permission:finance.budgets.edit',
                'destroy' => 'permission:finance.budgets.delete',
            ]);
        Route::post('budgets/{id}/approve', 'BudgetController@approve')->middleware('permission:finance.budgets.approve');
        Route::put('budgets/{id}/actual', 'BudgetController@updateActual')->middleware('permission:finance.budgets.edit');

        // Cost Centers
        Route::apiResource('cost-centers', 'CostCenterController')
            ->middleware([
                'store' => 'permission:finance.cost-centers.create',
                'update' => 'permission:finance.cost-centers.edit',
                'destroy' => 'permission:finance.cost-centers.delete',
            ]);
        Route::post('cost-centers/{id}/allocate-budget', 'CostCenterController@allocateBudget')->middleware('permission:finance.cost-centers.edit');
        Route::post('cost-centers/{id}/recalculate-budget', 'CostCenterController@recalculateBudget')->middleware('permission:finance.cost-centers.edit');
        Route::get('cost-centers/{id}/expenses', 'CostCenterController@expenses');
        Route::get('cost-centers/statistics', 'CostCenterController@statistics');
        Route::get('cost-centers/next-code', 'CostCenterController@getNextCode');

        // Projects
        Route::apiResource('projects', 'ProjectController')
            ->middleware([
                'store' => 'permission:finance.projects.create',
                'update' => 'permission:finance.projects.edit',
                'destroy' => 'permission:finance.projects.delete',
            ]);
        Route::post('projects/{id}/calculate-profitability', 'ProjectController@calculateProfitability')->middleware('permission:finance.projects.edit');
        Route::put('projects/{id}/update-progress', 'ProjectController@updateProgress')->middleware('permission:finance.projects.edit');
        Route::get('projects/{id}/expenses', 'ProjectController@expenses');
        Route::get('projects/statistics', 'ProjectController@statistics');
        Route::get('projects/next-code', 'ProjectController@getNextCode');

        // Fiscal Years
        Route::apiResource('fiscal-years', 'FiscalYearController')
            ->middleware([
                'store' => 'permission:finance.fiscal-years.create',
                'update' => 'permission:finance.fiscal-years.edit',
                'destroy' => 'permission:finance.fiscal-years.delete',
            ]);
        Route::post('fiscal-years/{id}/close', 'FiscalYearController@close')->middleware('permission:finance.fiscal-years.close');
        Route::post('fiscal-years/{id}/reopen', 'FiscalYearController@reopen')->middleware('permission:finance.fiscal-years.reopen');
        Route::get('fiscal-years/{id}/summary', 'FiscalYearController@summary');
        Route::get('fiscal-years/current', 'FiscalYearController@getCurrent');
        Route::get('fiscal-years/statistics', 'FiscalYearController@statistics');
        Route::get('fiscal-years/check-date', 'FiscalYearController@checkDate');

        // Accounts Payable (Vendor Bills) - Specific routes must come BEFORE apiResource
        Route::get('accounts-payable/aging-report', 'AccountsPayableController@agingReport');
        Route::get('accounts-payable/payments', 'AccountsPayableController@payments');
        Route::get('accounts-payable/statistics', 'AccountsPayableController@statistics');
        Route::apiResource('accounts-payable', 'AccountsPayableController')
            ->middleware([
                'store' => 'permission:finance.accounts-payable.create',
                'update' => 'permission:finance.accounts-payable.edit',
                'destroy' => 'permission:finance.accounts-payable.delete',
            ]);
        Route::post('accounts-payable/payments', 'AccountsPayableController@storePayment')->middleware('permission:finance.accounts-payable.create');

        // Accounts Receivable (Customer Invoices) - Specific routes must come BEFORE apiResource
        Route::get('accounts-receivable/aging-report', 'AccountsReceivableController@agingReport');
        Route::get('accounts-receivable/payments', 'AccountsReceivableController@payments');
        Route::get('accounts-receivable/statistics', 'AccountsReceivableController@statistics');
        Route::apiResource('accounts-receivable', 'AccountsReceivableController')
            ->middleware([
                'store' => 'permission:finance.accounts-receivable.create',
                'update' => 'permission:finance.accounts-receivable.edit',
                'destroy' => 'permission:finance.accounts-receivable.delete',
            ]);
        Route::post('accounts-receivable/payments', 'AccountsReceivableController@storePayment')->middleware('permission:finance.accounts-receivable.create');

        // Advanced Financial Reports
        Route::prefix('reports/custom')->middleware('permission:finance.reports.index')->group(function () {
            Route::get('/', 'FinancialReportController@index');
            Route::post('/', 'FinancialReportController@store')->middleware('permission:finance.reports.custom.create');
            Route::get('/statistics', 'FinancialReportController@statistics');
            Route::get('/templates', 'FinancialReportController@templates');
            Route::get('/{id}', 'FinancialReportController@show');
            Route::put('/{id}', 'FinancialReportController@update')->middleware('permission:finance.reports.custom.edit');
            Route::delete('/{id}', 'FinancialReportController@destroy')->middleware('permission:finance.reports.custom.delete');
            Route::post('/{id}/generate', 'FinancialReportController@generate')->middleware('permission:finance.reports.custom.generate');
            Route::get('/{id}/export', 'FinancialReportController@export')->middleware('permission:finance.reports.custom.export');
        });

        // Audit Trail
        Route::prefix('audit')->middleware('permission:finance.audit.index')->group(function () {
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
    Route::group(['prefix' => 'cms', 'middleware' => 'permission:cms.tickets.index'], function () {
        Route::apiResource('support-tickets', 'TicketController')
            ->middleware([
                'store' => 'permission:cms.tickets.create',
                'update' => 'permission:cms.tickets.edit',
                'destroy' => 'permission:cms.tickets.delete',
            ]);
        Route::apiResource('landing-pages', 'LandingPageController')
            ->middleware([
                'store' => 'permission:cms.landing-pages.create',
                'update' => 'permission:cms.landing-pages.edit',
                'destroy' => 'permission:cms.landing-pages.delete',
            ]);
        Route::apiResource('menus', 'MenuController')
            ->middleware([
                'store' => 'permission:cms.menus.create',
                'update' => 'permission:cms.menus.edit',
                'destroy' => 'permission:cms.menus.delete',
            ]);
        Route::post('payment/bkash/init/{order_id}', 'PaymentController@payWithBkash')->middleware('permission:cms.payments.bkash.init');
    });

    // --- Module: PROCUREMENT ---
    Route::group(['prefix' => 'procurement', 'middleware' => 'permission:procurement.products.index'], function () {
        // Statistics - must come before apiResource
        Route::get('statistics', 'ProcurementController@statistics');
        Route::get('suppliers/{id}/products', 'ProcurementController@getBySupplier');
        Route::patch('products/{id}/status', 'ProcurementController@updateStatus')->middleware('permission:procurement.products.status');
        Route::apiResource('products', 'ProcurementController')
            ->middleware([
                'store' => 'permission:procurement.products.create',
                'update' => 'permission:procurement.products.edit',
                'destroy' => 'permission:procurement.products.delete',
            ]);

        // Purchase Orders
        Route::get('orders/statistics', 'PurchaseOrderController@statistics');
        Route::patch('orders/{id}/status', 'PurchaseOrderController@updateStatus')->middleware('permission:procurement.orders.edit');
        Route::post('orders/{id}/approve-and-stock', 'PurchaseOrderController@approveAndStock')->middleware('permission:procurement.orders.approve');
        Route::patch('orders/{poId}/status-history/{historyId}/comments', 'PurchaseOrderController@updateStatusHistoryComments')->middleware('permission:procurement.orders.edit');
        Route::patch('orders/{poId}/status-history/{historyId}/timeline-data', 'PurchaseOrderController@updateStatusHistoryTimelineData')->middleware('permission:procurement.orders.edit');
        Route::apiResource('orders', 'PurchaseOrderController')
            ->middleware([
                'store' => 'permission:procurement.orders.create',
                'update' => 'permission:procurement.orders.edit',
                'destroy' => 'permission:procurement.orders.delete',
            ]);
    });

    // --- Others ---
    Route::get('loyalty-rules', 'LoyaltyController@index')->middleware('permission:crm.loyalty.index');
    Route::apiResource('affiliates', 'AffiliateController')
        ->middleware([
            'store' => 'permission:crm.affiliates.create',
            'update' => 'permission:crm.affiliates.edit',
            'destroy' => 'permission:crm.affiliates.delete',
        ]);

});

// ====================================================
// MODULE: AUDIT LOGS (Admin Control)
// ====================================================
Route::group([
    'prefix' => 'v2/admin',
    'namespace' => 'App\Http\Controllers\Api\V2',
    'middleware' => ['auth', 'permission:admin.audit-logs.index']
], function () {
    Route::get('audit-logs', 'AuditController@index');
    Route::get('audit-logs/{fileName}/preview', 'AuditController@preview');
    Route::get('audit-logs/{fileName}/download', 'AuditController@download');
    Route::delete('audit-logs/{fileName}', 'AuditController@destroy')->middleware('permission:admin.audit-logs.delete');
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
    'middleware' => ['auth', 'permission:website.orders.index'],
], function () {
    // Order Statistics
    Route::get('orders/statistics', 'OrderController@statistics');

    // Product Search (for adding items)
    Route::get('products/search', 'OrderController@searchProducts')->middleware('permission:website.orders.products.search');
    Route::get('products/search-products', 'OrderController@searchProductsGrouped')->middleware('permission:website.orders.products.search');
    Route::get('products/top-selling', 'OrderController@topSellingProducts');

    // Product Variants (for changing variant on an item)
    Route::get('products/{id}/variants', 'OrderController@productVariants');

    // Delivery Charge Calculator
    Route::post('orders/calculate-delivery', 'OrderController@calculateDeliveryCharge')->middleware('permission:website.orders.delivery.calculate');

    // Order CRUD
    Route::get('orders', 'OrderController@index');
    Route::get('orders/{id}', 'OrderController@show');
    Route::put('orders/{id}', 'OrderController@update')->middleware('permission:website.orders.edit');

    // Order Status
    Route::put('orders/{id}/status', 'OrderController@updateStatus')->middleware('permission:website.orders.status');
    Route::get('orders/{id}/status-history', 'OrderController@statusHistory')->middleware('permission:website.orders.status-history');

    // Payment
    Route::put('orders/{id}/payment', 'OrderController@updatePayment')->middleware('permission:website.orders.payment');

    // Item Management
    Route::post('orders/{id}/items', 'OrderController@addItem')->middleware('permission:website.orders.items.add');
    Route::put('orders/{orderId}/items/{itemId}', 'OrderController@updateItem')->middleware('permission:website.orders.items.edit');
    Route::delete('orders/{orderId}/items/{itemId}', 'OrderController@removeItem')->middleware('permission:website.orders.items.remove');

    // Courier (Steadfast)
    Route::post('orders/{id}/send-to-courier', 'OrderController@sendToCourier')->middleware('permission:website.orders.courier.send');
    Route::post('orders/{id}/sync-courier', 'OrderController@syncCourierStatus')->middleware('permission:website.orders.courier.sync');

    // Activity Log
    Route::get('orders/{id}/activity-log', 'OrderController@activityLog')->middleware('permission:website.orders.activity-log');

    // SMS
    Route::post('orders/{id}/send-sms', 'OrderController@sendSms')->middleware('permission:website.orders.sms');

    // Sliders (Module Slider)
    Route::post('sliders/reorder', 'SliderController@reorder')->middleware('permission:website.sliders.reorder');
    Route::apiResource('sliders', 'SliderController')
        ->middleware([
            'store' => 'permission:website.sliders.create',
            'update' => 'permission:website.sliders.edit',
            'destroy' => 'permission:website.sliders.delete',
        ]);
});
