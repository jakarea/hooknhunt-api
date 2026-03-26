<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing permissions
        Permission::query()->delete();

        // Define all permissions by group and module
        $permissions = [
            // ====================================================
            // GROUP: DASHBOARD
            // ====================================================
            [
                'name' => 'View Dashboard',
                'slug' => 'dashboard.view',
                'key' => 'dashboard_view',
                'group_name' => 'Dashboard',
                'module_name' => 'Dashboard',
            ],
            // [
            //     'name' => 'View Analytics',
            //     'slug' => 'dashboard.analytics',
            //     'key' => 'dashboard_analytics',
            //     'group_name' => 'Dashboard',
            //     'module_name' => 'Dashboard',
            // ],
            // [
            //     'name' => 'View Notifications',
            //     'slug' => 'dashboard.notifications',
            //     'key' => 'dashboard_notifications',
            //     'group_name' => 'Dashboard',
            //     'module_name' => 'Dashboard',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - Products
            // // ====================================================
            // [
            //     'name' => 'View Products',
            //     'slug' => 'catalog.products.index',
            //     'key' => 'catalog_products_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Create Product',
            //     'slug' => 'catalog.products.create',
            //     'key' => 'catalog_products_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Edit Product',
            //     'slug' => 'catalog.products.edit',
            //     'key' => 'catalog_products_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Delete Product',
            //     'slug' => 'catalog.products.delete',
            //     'key' => 'catalog_products_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'View Categories',
            //     'slug' => 'catalog.categories.index',
            //     'key' => 'catalog_categories_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Create Category',
            //     'slug' => 'catalog.categories.create',
            //     'key' => 'catalog_categories_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Edit Category',
            //     'slug' => 'catalog.categories.edit',
            //     'key' => 'catalog_categories_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Delete Category',
            //     'slug' => 'catalog.categories.delete',
            //     'key' => 'catalog_categories_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'View Brands',
            //     'slug' => 'catalog.brands.index',
            //     'key' => 'catalog_brands_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Create Brand',
            //     'slug' => 'catalog.brands.create',
            //     'key' => 'catalog_brands_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Edit Brand',
            //     'slug' => 'catalog.brands.edit',
            //     'key' => 'catalog_brands_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Delete Brand',
            //     'slug' => 'catalog.brands.delete',
            //     'key' => 'catalog_brands_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'View Variants',
            //     'slug' => 'catalog.variants.index',
            //     'key' => 'catalog_variants_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Create Variant',
            //     'slug' => 'catalog.variants.create',
            //     'key' => 'catalog_variants_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Manage Attributes',
            //     'slug' => 'catalog.attributes.manage',
            //     'key' => 'catalog_attributes_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],
            // [
            //     'name' => 'Manage Discounts',
            //     'slug' => 'catalog.discounts.manage',
            //     'key' => 'catalog_discounts_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Products',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - Inventory
            // // ====================================================
            // [
            //     'name' => 'View Current Stock',
            //     'slug' => 'inventory.stock.index',
            //     'key' => 'inventory_stock_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Inventory',
            // ],
            // [
            //     'name' => 'Manage Warehouses',
            //     'slug' => 'inventory.warehouses.manage',
            //     'key' => 'inventory_warehouses_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Inventory',
            // ],
            // [
            //     'name' => 'Manage Stock Adjustments',
            //     'slug' => 'inventory.adjustments.manage',
            //     'key' => 'inventory_adjustments_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Inventory',
            // ],
            // [
            //     'name' => 'Manage Stock Transfers',
            //     'slug' => 'inventory.transfers.manage',
            //     'key' => 'inventory_transfers_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Inventory',
            // ],
            // [
            //     'name' => 'View Stock History',
            //     'slug' => 'inventory.history.view',
            //     'key' => 'inventory_history_view',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Inventory',
            // ],
            // [
            //     'name' => 'Manage Stock Sorting',
            //     'slug' => 'inventory.sorting.manage',
            //     'key' => 'inventory_sorting_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Inventory',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - Procurement
            // // ====================================================
            // [
            //     'name' => 'View Purchase Orders',
            //     'slug' => 'procurement.orders.index',
            //     'key' => 'procurement_orders_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Procurement',
            // ],
            // [
            //     'name' => 'Create Purchase Order',
            //     'slug' => 'procurement.orders.create',
            //     'key' => 'procurement_orders_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Procurement',
            // ],
            // [
            //     'name' => 'Edit Purchase Order',
            //     'slug' => 'procurement.orders.edit',
            //     'key' => 'procurement_orders_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Procurement',
            // ],
            // [
            //     'name' => 'Delete Purchase Order',
            //     'slug' => 'procurement.orders.delete',
            //     'key' => 'procurement_orders_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Procurement',
            // ],
            // [
            //     'name' => 'Manage Suppliers',
            //     'slug' => 'procurement.suppliers.manage',
            //     'key' => 'procurement_suppliers_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Procurement',
            // ],
            // [
            //     'name' => 'Manage Returns',
            //     'slug' => 'procurement.returns.manage',
            //     'key' => 'procurement_returns_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Procurement',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - Shipments
            // // ====================================================
            // [
            //     'name' => 'View Shipments',
            //     'slug' => 'shipments.index',
            //     'key' => 'shipments_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Shipments',
            // ],
            // [
            //     'name' => 'Create Shipment',
            //     'slug' => 'shipments.create',
            //     'key' => 'shipments_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Shipments',
            // ],
            // [
            //     'name' => 'Edit Shipment',
            //     'slug' => 'shipments.edit',
            //     'key' => 'shipments_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Shipments',
            // ],
            // [
            //     'name' => 'Delete Shipment',
            //     'slug' => 'shipments.delete',
            //     'key' => 'shipments_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Shipments',
            // ],
            // [
            //     'name' => 'Manage Couriers',
            //     'slug' => 'shipments.couriers.manage',
            //     'key' => 'shipments_couriers_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Shipments',
            // ],
            // [
            //     'name' => 'View Shipment Costing',
            //     'slug' => 'shipments.costing.view',
            //     'key' => 'shipments_costing_view',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Shipments',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - Sales
            // // ====================================================
            // [
            //     'name' => 'View Sales Orders',
            //     'slug' => 'sales.orders.index',
            //     'key' => 'sales_orders_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],
            // [
            //     'name' => 'Create Sales Order',
            //     'slug' => 'sales.orders.create',
            //     'key' => 'sales_orders_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],
            // [
            //     'name' => 'Edit Sales Order',
            //     'slug' => 'sales.orders.edit',
            //     'key' => 'sales_orders_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],
            // [
            //     'name' => 'Delete Sales Order',
            //     'slug' => 'sales.orders.delete',
            //     'key' => 'sales_orders_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],
            // [
            //     'name' => 'Manage Returns',
            //     'slug' => 'sales.returns.manage',
            //     'key' => 'sales_returns_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],
            // [
            //     'name' => 'Manage Quotations',
            //     'slug' => 'sales.quotations.manage',
            //     'key' => 'sales_quotations_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],
            // [
            //     'name' => 'Manage Customers',
            //     'slug' => 'sales.customers.manage',
            //     'key' => 'sales_customers_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'Sales',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - POS
            // // ====================================================
            // [
            //     'name' => 'Access POS Terminal',
            //     'slug' => 'pos.terminal.access',
            //     'key' => 'pos_terminal_access',
            //     'group_name' => 'Operations',
            //     'module_name' => 'POS',
            // ],
            // [
            //     'name' => 'View POS History',
            //     'slug' => 'pos.history.view',
            //     'key' => 'pos_history_view',
            //     'group_name' => 'Operations',
            //     'module_name' => 'POS',
            // ],
            // [
            //     'name' => 'Manage POS Register',
            //     'slug' => 'pos.register.manage',
            //     'key' => 'pos_register_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'POS',
            // ],
            // [
            //     'name' => 'Manage Held Orders',
            //     'slug' => 'pos.held.manage',
            //     'key' => 'pos_held_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'POS',
            // ],

            // // ====================================================
            // // GROUP: OPERATIONS - CRM
            // // ====================================================
            // [
            //     'name' => 'View Leads',
            //     'slug' => 'crm.leads.index',
            //     'key' => 'crm_leads_index',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Create Lead',
            //     'slug' => 'crm.leads.create',
            //     'key' => 'crm_leads_create',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Edit Lead',
            //     'slug' => 'crm.leads.edit',
            //     'key' => 'crm_leads_edit',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Delete Lead',
            //     'slug' => 'crm.leads.delete',
            //     'key' => 'crm_leads_delete',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Manage Activities',
            //     'slug' => 'crm.activities.manage',
            //     'key' => 'crm_activities_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Manage Campaigns',
            //     'slug' => 'crm.campaigns.manage',
            //     'key' => 'crm_campaigns_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Manage Customer Wallet',
            //     'slug' => 'crm.wallet.manage',
            //     'key' => 'crm_wallet_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],
            // [
            //     'name' => 'Manage Loyalty Program',
            //     'slug' => 'crm.loyalty.manage',
            //     'key' => 'crm_loyalty_manage',
            //     'group_name' => 'Operations',
            //     'module_name' => 'CRM',
            // ],

            // ====================================================
            // GROUP: HRM - Staff
            // ====================================================
            [
                'name' => 'View Staff',
                'slug' => 'hrm.staff.index',
                'key' => 'hrm_staff_index',
                'group_name' => 'HRM',
                'module_name' => 'Staff',
            ],
            [
                'name' => 'Create Staff',
                'slug' => 'hrm.staff.create',
                'key' => 'hrm_staff_create',
                'group_name' => 'HRM',
                'module_name' => 'Staff',
            ],
            [
                'name' => 'Edit Staff',
                'slug' => 'hrm.staff.edit',
                'key' => 'hrm_staff_edit',
                'group_name' => 'HRM',
                'module_name' => 'Staff',
            ],
            [
                'name' => 'Delete Staff',
                'slug' => 'hrm.staff.delete',
                'key' => 'hrm_staff_delete',
                'group_name' => 'HRM',
                'module_name' => 'Staff',
            ],
            [
                'name' => 'Manage Staff Salaries',
                'slug' => 'hrm.staff.salary',
                'key' => 'hrm_staff_salary',
                'group_name' => 'HRM',
                'module_name' => 'Staff',
            ],

            // ====================================================
            // GROUP: HRM - Departments
            // ====================================================
            [
                'name' => 'View Departments',
                'slug' => 'hrm.departments.index',
                'key' => 'hrm_departments_index',
                'group_name' => 'HRM',
                'module_name' => 'Departments',
            ],
            [
                'name' => 'Create Department',
                'slug' => 'hrm.departments.create',
                'key' => 'hrm_departments_create',
                'group_name' => 'HRM',
                'module_name' => 'Departments',
            ],
            [
                'name' => 'Edit Department',
                'slug' => 'hrm.departments.edit',
                'key' => 'hrm_departments_edit',
                'group_name' => 'HRM',
                'module_name' => 'Departments',
            ],
            [
                'name' => 'Delete Department',
                'slug' => 'hrm.departments.delete',
                'key' => 'hrm_departments_delete',
                'group_name' => 'HRM',
                'module_name' => 'Departments',
            ],

            // ====================================================
            // GROUP: HRM - Leaves
            // ====================================================
            [
                'name' => 'View Leaves',
                'slug' => 'hrm.leaves.index',
                'key' => 'hrm_leaves_index',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],
            [
                'name' => 'Create Leave',
                'slug' => 'hrm.leaves.create',
                'key' => 'hrm_leaves_create',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],
            [
                'name' => 'Edit Leave',
                'slug' => 'hrm.leaves.edit',
                'key' => 'hrm_leaves_edit',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],
            [
                'name' => 'Delete Leave',
                'slug' => 'hrm.leaves.delete',
                'key' => 'hrm_leaves_delete',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],
            [
                'name' => 'Approve Leave',
                'slug' => 'hrm.leaves.approve',
                'key' => 'hrm_leaves_approve',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],
            [
                'name' => 'Reject Leave',
                'slug' => 'hrm.leaves.reject',
                'key' => 'hrm_leaves_reject',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],
            [
                'name' => 'Cancel Leave',
                'slug' => 'hrm.leaves.cancel',
                'key' => 'hrm_leaves_cancel',
                'group_name' => 'HRM',
                'module_name' => 'Leaves',
            ],

            // ====================================================
            // GROUP: HRM - Attendance
            // ====================================================
            [
                'name' => 'View Attendance',
                'slug' => 'hrm.attendance.index',
                'key' => 'hrm_attendance_index',
                'group_name' => 'HRM',
                'module_name' => 'Attendance',
            ],
            [
                'name' => 'Create Attendance',
                'slug' => 'hrm.attendance.create',
                'key' => 'hrm_attendance_create',
                'group_name' => 'HRM',
                'module_name' => 'Attendance',
            ],
            [
                'name' => 'Edit Attendance',
                'slug' => 'hrm.attendance.edit',
                'key' => 'hrm_attendance_edit',
                'group_name' => 'HRM',
                'module_name' => 'Attendance',
            ],
            [
                'name' => 'Approve Attendance',
                'slug' => 'hrm.attendance.approve',
                'key' => 'hrm_attendance_approve',
                'group_name' => 'HRM',
                'module_name' => 'Attendance',
            ],
            [
                'name' => 'Clock In',
                'slug' => 'hrm.attendance.clock-in',
                'key' => 'hrm_attendance_clock_in',
                'group_name' => 'HRM',
                'module_name' => 'Attendance',
            ],
            [
                'name' => 'Clock Out',
                'slug' => 'hrm.attendance.clock-out',
                'key' => 'hrm_attendance_clock_out',
                'group_name' => 'HRM',
                'module_name' => 'Attendance',
            ],

            // ====================================================
            // GROUP: HRM - Payroll
            // ====================================================
            [
                'name' => 'View Payroll',
                'slug' => 'hrm.payroll.index',
                'key' => 'hrm_payroll_index',
                'group_name' => 'HRM',
                'module_name' => 'Payroll',
            ],
            [
                'name' => 'Create Payroll',
                'slug' => 'hrm.payroll.create',
                'key' => 'hrm_payroll_create',
                'group_name' => 'HRM',
                'module_name' => 'Payroll',
            ],
            [
                'name' => 'Edit Payroll',
                'slug' => 'hrm.payroll.edit',
                'key' => 'hrm_payroll_edit',
                'group_name' => 'HRM',
                'module_name' => 'Payroll',
            ],
            [
                'name' => 'Process Payroll',
                'slug' => 'hrm.payroll.process',
                'key' => 'hrm_payroll_process',
                'group_name' => 'HRM',
                'module_name' => 'Payroll',
            ],
            [
                'name' => 'Approve Payroll',
                'slug' => 'hrm.payroll.approve',
                'key' => 'hrm_payroll_approve',
                'group_name' => 'HRM',
                'module_name' => 'Payroll',
            ],
            [
                'name' => 'Pay Payroll',
                'slug' => 'hrm.payroll.pay',
                'key' => 'hrm_payroll_pay',
                'group_name' => 'HRM',
                'module_name' => 'Payroll',
            ],

            // ====================================================
            // GROUP: HRM - Roles
            // ====================================================
            [
                'name' => 'View Roles',
                'slug' => 'hrm.roles.index',
                'key' => 'hrm_roles_index',
                'group_name' => 'HRM',
                'module_name' => 'Roles',
            ],
            [
                'name' => 'Create Role',
                'slug' => 'hrm.roles.create',
                'key' => 'hrm_roles_create',
                'group_name' => 'HRM',
                'module_name' => 'Roles',
            ],
            [
                'name' => 'Edit Role',
                'slug' => 'hrm.roles.edit',
                'key' => 'hrm_roles_edit',
                'group_name' => 'HRM',
                'module_name' => 'Roles',
            ],
            [
                'name' => 'Delete Role',
                'slug' => 'hrm.roles.delete',
                'key' => 'hrm_roles_delete',
                'group_name' => 'HRM',
                'module_name' => 'Roles',
            ],
            [
                'name' => 'Assign Role to User',
                'slug' => 'hrm.roles.assign',
                'key' => 'hrm_roles_assign',
                'group_name' => 'HRM',
                'module_name' => 'Roles',
            ],
            [
                'name' => 'Sync Role Permissions',
                'slug' => 'hrm.roles.sync-permissions',
                'key' => 'hrm_roles_sync_permissions',
                'group_name' => 'HRM',
                'module_name' => 'Roles',
            ],

            // ====================================================
            // GROUP: FINANCE - Finance
            // ====================================================
            // [
            //     'name' => 'View Transactions',
            //     'slug' => 'finance.transactions.index',
            //     'key' => 'finance_transactions_index',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Finance',
            // ],
            // [
            //     'name' => 'Manage Accounts',
            //     'slug' => 'finance.accounts.manage',
            //     'key' => 'finance_accounts_manage',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Finance',
            // ],
            // [
            //     'name' => 'Manage Expenses',
            //     'slug' => 'finance.expenses.manage',
            //     'key' => 'finance_expenses_manage',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Finance',
            // ],
            // [
            //     'name' => 'View Financial Reports',
            //     'slug' => 'finance.reports.view',
            //     'key' => 'finance_reports_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Finance',
            // ],

            // // ====================================================
            // // GROUP: FINANCE - Reports
            // // ====================================================
            // [
            //     'name' => 'View Sales Reports',
            //     'slug' => 'reports.sales.view',
            //     'key' => 'reports_sales_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Reports',
            // ],
            // [
            //     'name' => 'View Stock Reports',
            //     'slug' => 'reports.stock.view',
            //     'key' => 'reports_stock_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Reports',
            // ],
            // [
            //     'name' => 'View Product Reports',
            //     'slug' => 'reports.products.view',
            //     'key' => 'reports_products_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Reports',
            // ],
            // [
            //     'name' => 'View Customer Reports',
            //     'slug' => 'reports.customers.view',
            //     'key' => 'reports_customers_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Reports',
            // ],
            // [
            //     'name' => 'View Tax Reports',
            //     'slug' => 'reports.tax.view',
            //     'key' => 'reports_tax_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Reports',
            // ],
            // [
            //     'name' => 'View Profit Loss',
            //     'slug' => 'reports.profit-loss.view',
            //     'key' => 'reports_profit_loss_view',
            //     'group_name' => 'Finance',
            //     'module_name' => 'Reports',
            // ],

            // // ====================================================
            // // GROUP: SETTINGS - System
            // // ====================================================
            // [
            //     'name' => 'Manage System Settings',
            //     'slug' => 'system.manage',
            //     'key' => 'system_manage',
            //     'group_name' => 'Settings',
            //     'module_name' => 'System',
            // ],
            // [
            //     'name' => 'View Permissions',
            //     'slug' => 'permissions.view',
            //     'key' => 'permissions_view',
            //     'group_name' => 'Settings',
            //     'module_name' => 'System',
            // ],
            // [
            //     'name' => 'Create Permission',
            //     'slug' => 'permissions.create',
            //     'key' => 'permissions_create',
            //     'group_name' => 'Settings',
            //     'module_name' => 'System',
            // ],

            // // ====================================================
            // // GROUP: SETTINGS - User Management
            // // ====================================================
            // [
            //     'name' => 'View Users',
            //     'slug' => 'user.index',
            //     'key' => 'user_index',
            //     'group_name' => 'Settings',
            //     'module_name' => 'User Management',
            // ],
            // [
            //     'name' => 'Create User',
            //     'slug' => 'user.create',
            //     'key' => 'user_create',
            //     'group_name' => 'Settings',
            //     'module_name' => 'User Management',
            // ],
            // [
            //     'name' => 'Edit User',
            //     'slug' => 'user.edit',
            //     'key' => 'user_edit',
            //     'group_name' => 'Settings',
            //     'module_name' => 'User Management',
            // ],
            // [
            //     'name' => 'Delete User',
            //     'slug' => 'user.delete',
            //     'key' => 'user_delete',
            //     'group_name' => 'Settings',
            //     'module_name' => 'User Management',
            // ],
            // [
            //     'name' => 'Ban User',
            //     'slug' => 'user.ban',
            //     'key' => 'user_ban',
            //     'group_name' => 'Settings',
            //     'module_name' => 'User Management',
            // ],
            // [
            //     'name' => 'Give Direct Permissions',
            //     'slug' => 'user.direct-access',
            //     'key' => 'user_direct_access',
            //     'group_name' => 'Settings',
            //     'module_name' => 'User Management',
            // ],

            // // ====================================================
            // // GROUP: SETTINGS - Media
            // // ====================================================
            // [
            //     'name' => 'Manage Media',
            //     'slug' => 'media.manage',
            //     'key' => 'media_manage',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Media',
            // ],
            // [
            //     'name' => 'Upload Files',
            //     'slug' => 'media.upload',
            //     'key' => 'media_upload',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Media',
            // ],
            // [
            //     'name' => 'Delete Files',
            //     'slug' => 'media.delete',
            //     'key' => 'media_delete',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Media',
            // ],

            // // ====================================================
            // // GROUP: SETTINGS - Support
            // // ====================================================
            // [
            //     'name' => 'Manage Support Tickets',
            //     'slug' => 'support.manage',
            //     'key' => 'support_manage',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Support',
            // ],
            // [
            //     'name' => 'Manage Landing Pages',
            //     'slug' => 'support.landing-pages.manage',
            //     'key' => 'support_landing_pages_manage',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Support',
            // ],
            // [
            //     'name' => 'Manage Menus',
            //     'slug' => 'support.menus.manage',
            //     'key' => 'support_menus_manage',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Support',
            // ],
            // [
            //     'name' => 'Manage Banners',
            //     'slug' => 'support.banners.manage',
            //     'key' => 'support_banners_manage',
            //     'group_name' => 'Settings',
            //     'module_name' => 'Support',
            // ],

            // // ====================================================
            // // GROUP: ADMIN - Audit Logs
            // // ====================================================
            // [
            //     'name' => 'View Audit Logs',
            //     'slug' => 'audit.view',
            //     'key' => 'audit_view',
            //     'group_name' => 'Admin',
            //     'module_name' => 'Audit Logs',
            // ],
            // [
            //     'name' => 'Download Audit Logs',
            //     'slug' => 'audit.download',
            //     'key' => 'audit_download',
            //     'group_name' => 'Admin',
            //     'module_name' => 'Audit Logs',
            // ],
            // [
            //     'name' => 'Delete Audit Logs',
            //     'slug' => 'audit.delete',
            //     'key' => 'audit_delete',
            //     'group_name' => 'Admin',
            //     'module_name' => 'Audit Logs',
            // ],
        ];

        // Insert permissions in batches
        foreach ($permissions as $permission) {
            Permission::create($permission);
        }

        $this->command->info('✅ Successfully seeded ' . count($permissions) . ' permissions.');
    }
}