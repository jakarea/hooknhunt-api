import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { GlobalMediaSelectorProvider } from '@/hooks/useMediaSelector';
import { theme } from '@/lib/mantine-theme';
import ProtectedRoute from '@/components/ProtectedRoute'
import { AdminLayout } from '@/components/admin-layout'
import AdminDashboard from "@/app/admin/dashboard/page"
import Analytics from "@/app/admin/dashboard/analytics/page"
import Profile from "@/app/admin/profile/page"
import NotificationsPage from "@/app/admin/notifications/page"
import Products from "@/app/admin/catalog/products/page"
import ProductDetail from "@/app/admin/catalog/products/[id]/page"
import CreateProduct from "@/app/admin/catalog/products/create/page"
import EditProduct from "@/app/admin/catalog/products/[id]/edit/page"
import Variants from "@/app/admin/catalog/variants/page"
import VariantAttributes from "@/app/admin/catalog/variant-attributes/page"
import Categories from "@/app/admin/catalog/categories/page"
import Brands from "@/app/admin/catalog/brands/page"
import Attributes from "@/app/admin/catalog/attributes/page"
import Units from "@/app/admin/catalog/units/page"
import PrintLabels from "@/app/admin/catalog/print-labels/page"
import PurchaseOrders from "@/app/admin/procurement/orders/page"
import CreatePO from "@/app/admin/procurement/create/page"
import PurchaseOrderDetails from "@/app/admin/procurement/orders/[id]/page"
import EditPO from "@/app/admin/procurement/orders/[id]/edit/page"
import Suppliers from "@/app/admin/procurement/suppliers/page"
import SupplierDetails from "@/app/admin/procurement/suppliers/[id]/page"
import PurchaseReturns from "@/app/admin/procurement/returns/page"
import ProcurementProducts from "@/app/admin/procurement/products/page"
import ProcurementProductDetail from "@/app/admin/procurement/products/[id]/page"
import EditProcurementProduct from "@/app/admin/procurement/products/[id]/edit/page"
import Shipments from "@/app/admin/shipments/page"
import CreateShipment from "@/app/admin/shipments/create/page"
import ViewShipment from "@/app/admin/shipments/view/page"
import ShipmentCosting from "@/app/admin/shipments/costing/page"
import ReceiveStock from "@/app/admin/shipments/receive/page"
import CurrentStock from "@/app/admin/inventory/stock/page"
import UnsortedStock from "@/app/admin/inventory/sorting/page"
import StockHistory from "@/app/admin/inventory/history/page"
import Warehouses from "@/app/admin/inventory/warehouses/page"
import Transfers from "@/app/admin/inventory/transfers/page"
import Adjustments from "@/app/admin/inventory/adjustments/page"
import StockTake from "@/app/admin/inventory/stock-take/page"
import SalesOrders from "@/app/admin/sales/orders/page"
import OrderDetails from "@/app/admin/sales/orders/[id]/page"
import CreateSalesOrder from "@/app/admin/sales/create/page"
import SalesReturns from "@/app/admin/sales/returns/page"
import Quotations from "@/app/admin/sales/quotations/page"
import POSTerminal from "@/app/admin/pos/page"
import POSHistory from "@/app/admin/pos/history/page"
import POSRegister from "@/app/admin/pos/register/page"
import HeldOrders from "@/app/admin/pos/held/page"
import CourierBooking from "@/app/admin/logistics/booking/page"
import TrackingHub from "@/app/admin/logistics/tracking/page"
import Couriers from "@/app/admin/logistics/couriers/page"
import Zones from "@/app/admin/logistics/zones/page"
import CRMDashboard from "@/app/admin/crm/page"
import Customers from "@/app/admin/crm/customers/page"
import CreateCustomer from "@/app/admin/crm/customers/create/page"
import CustomerDetails from "@/app/admin/crm/customers/[id]/page"
import EditCustomer from "@/app/admin/crm/customers/[id]/edit/page"
import Leads from "@/app/admin/crm/leads/page"
import CreateLead from "@/app/admin/crm/leads/create/page"
import EditLead from "@/app/admin/crm/leads/[id]/edit/page"
import Wallet from "@/app/admin/crm/wallet/page"
import WalletDetails from "@/app/admin/crm/wallet/[id]/page"
import Campaigns from "@/app/admin/marketing/campaigns/page"
import Affiliates from "@/app/admin/marketing/affiliates/page"
import LoyaltyRules from "@/app/admin/crm/loyalty/page"
import HRMDashboard from "@/app/admin/hrm/page"
import Staff from "@/app/admin/hrm/staff/page"
import StaffProfile from "@/app/admin/hrm/staff/[id]/page"
import EditStaff from "@/app/admin/hrm/staff/[id]/edit/page"
import CreateStaffPage from "@/app/admin/hrm/staff/create/page"
import Departments from "@/app/admin/hrm/departments/page"
import Leaves from "@/app/admin/hrm/leaves/page"
import Attendance from "@/app/admin/hrm/attendance/page"
import EmployeeAttendance from "@/app/admin/hrm/employee-attendance/[id]/page"
import Payroll from "@/app/admin/hrm/payroll/page"
import FinanceDashboard from "@/app/admin/finance/page"
import Banks from "@/app/admin/finance/banks/page"
import CreateBank from "@/app/admin/finance/banks/create/page"
import BankDetails from "@/app/admin/finance/banks/[id]/page"
import EditBank from "@/app/admin/finance/banks/[id]/edit/page"
import Transactions from "@/app/admin/finance/transactions/page"
import Expenses from "@/app/admin/finance/expenses/page"
import CreateExpense from "@/app/admin/finance/expenses/create/page"
import EditExpense from "@/app/admin/finance/expenses/[id]/edit/page"
import Accounts from "@/app/admin/finance/accounts/page"
import CreateAccount from "@/app/admin/finance/accounts/create/page"
import ReportsIndex from "@/app/admin/finance/reports/page"
import ProfitLoss from "@/app/admin/finance/reports/profit-loss/page"
import BalanceSheet from "@/app/admin/finance/reports/balance-sheet/page"
import CashFlow from "@/app/admin/finance/reports/cash-flow/page"
import TrialBalance from "@/app/admin/finance/reports/trial-balance/page"
import GeneralLedger from "@/app/admin/finance/reports/general-ledger/page"
import FixedAssets from "@/app/admin/finance/fixed-assets/page"
import Cheques from "@/app/admin/finance/cheques/page"
import VatTaxLedger from "@/app/admin/finance/vat-tax/page"
import JournalEntries from "@/app/admin/finance/journal-entries/page"
import Budgets from "@/app/admin/finance/budgets/page"
import CostCenters from "@/app/admin/finance/cost-centers/page"
import Projects from "@/app/admin/finance/projects/page"
import FiscalYears from "@/app/admin/finance/fiscal-years/page"
import AccountsPayable from "@/app/admin/finance/accounts-payable/page"
import AccountsReceivable from "@/app/admin/finance/accounts-receivable/page"
import Currencies from "@/app/admin/finance/currencies/page"
import CustomReports from "@/app/admin/finance/reports/custom/page"
import FinanceAudit from "@/app/admin/finance/audit/page"
import Tickets from "@/app/admin/support/tickets/page"
import SupportCategories from "@/app/admin/support/categories/page"
import Banners from "@/app/admin/cms/banners/page"
import Menus from "@/app/admin/cms/menus/page"
import CMSPages from "@/app/admin/cms/pages/page"
import Blog from "@/app/admin/cms/blog/page"
import Media from "@/app/admin/cms/media/page"
import SalesReport from "@/app/admin/reports/sales/page"
import StockReport from "@/app/admin/reports/stock/page"
import ProductReport from "@/app/admin/reports/products/page"
import CustomerReport from "@/app/admin/reports/customers/page"
import TaxReport from "@/app/admin/reports/tax/page"
import Roles from "@/app/admin/roles/page"
import CreateRole from "@/app/admin/roles/create/page"
import EditRole from "@/app/admin/roles/edit/[id]/page"
import Permissions from "@/app/admin/permissions/page"
import AuditLogs from "@/app/admin/audit-logs/page"
import GeneralSettings from "@/app/admin/settings/general/page"
import PaymentSettings from "@/app/admin/settings/payments/page"
import SettingsRoles from "@/app/admin/hrm/roles/page"
import SettingsUsers from "@/app/admin/settings/users/page"
import SettingsPermissions from "@/app/admin/settings/permissions/page"
import APISettings from "@/app/admin/settings/api/page"
import Backup from "@/app/admin/settings/backup/page"
import TaxSettings from "@/app/admin/settings/taxes/page"
import WorkingHoursSettings from "@/app/admin/settings/working-hours/page"

import Login from "@/app/login/page"
import ForgotPassword from "@/app/forgot-password/page"
import SignUp from "@/app/register/page"
import VerifyOtpPage from "@/app/verify-otp/page"
import SuperAdminSignupPage from "@/app/register-super-admin/page"

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications />
        <GlobalMediaSelectorProvider>
          <BrowserRouter>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/register-super-admin" element={<SuperAdminSignupPage />} />

          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Admin routes with layout */}
            <Route path="/*" element={<AdminLayout />}>
              {/* Redirect /attendance and /leaves to /hrm/* for consistency */}
              <Route path="attendance" element={<Navigate to="/hrm/attendance" replace />} />
              <Route path="leaves" element={<Navigate to="/hrm/leaves" replace />} />

              {/* Other routes */}
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="dashboard/analytics" element={<Analytics />} />
              <Route path="profile" element={<Profile />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="catalog/products/create" element={<CreateProduct />} />
              <Route path="catalog/products/:id/edit" element={<EditProduct />} />
              <Route path="catalog/products/:id" element={<ProductDetail />} />
              <Route path="catalog/products" element={<Products />} />
              <Route path="catalog/variants" element={<Variants />} />
              <Route path="catalog/variant-attributes" element={<VariantAttributes />} />
              <Route path="catalog/categories" element={<Categories />} />
              <Route path="catalog/brands" element={<Brands />} />
              <Route path="catalog/attributes" element={<Attributes />} />
              <Route path="catalog/units" element={<Units />} />
              <Route path="catalog/print-labels" element={<PrintLabels />} />
              <Route path="procurement/orders" element={<PurchaseOrders />} />
              <Route path="procurement/create" element={<CreatePO />} />
              <Route path="procurement/orders/:id" element={<PurchaseOrderDetails />} />
              <Route path="procurement/orders/:id/edit" element={<EditPO />} />
              <Route path="procurement/suppliers" element={<Suppliers />} />
              <Route path="procurement/suppliers/:id" element={<SupplierDetails />} />
              <Route path="procurement/products" element={<ProcurementProducts />} />
              <Route path="procurement/products/:id/edit" element={<EditProcurementProduct />} />
              <Route path="procurement/products/:id" element={<ProcurementProductDetail />} />
              <Route path="procurement/returns" element={<PurchaseReturns />} />
              <Route path="shipments" element={<Shipments />} />
              <Route path="shipments/create" element={<CreateShipment />} />
              <Route path="shipments/view" element={<ViewShipment />} />
              <Route path="shipments/costing" element={<ShipmentCosting />} />
              <Route path="shipments/receive" element={<ReceiveStock />} />
              <Route path="inventory/stock" element={<CurrentStock />} />
              <Route path="inventory/sorting" element={<UnsortedStock />} />
              <Route path="inventory/history" element={<StockHistory />} />
              <Route path="inventory/warehouses" element={<Warehouses />} />
              <Route path="inventory/transfers" element={<Transfers />} />
              <Route path="inventory/adjustments" element={<Adjustments />} />
              <Route path="inventory/stock-take" element={<StockTake />} />
              <Route path="sales/orders" element={<SalesOrders />} />
              <Route path="sales/orders/:id" element={<OrderDetails />} />
              <Route path="sales/create" element={<CreateSalesOrder />} />
              <Route path="sales/returns" element={<SalesReturns />} />
              <Route path="sales/quotations" element={<Quotations />} />
              <Route path="pos" element={<POSTerminal />} />
              <Route path="pos/history" element={<POSHistory />} />
              <Route path="pos/register" element={<POSRegister />} />
              <Route path="pos/held" element={<HeldOrders />} />
              <Route path="logistics/booking" element={<CourierBooking />} />
              <Route path="logistics/tracking" element={<TrackingHub />} />
              <Route path="logistics/couriers" element={<Couriers />} />
              <Route path="logistics/zones" element={<Zones />} />
              <Route path="crm" element={<CRMDashboard />} />
              <Route path="crm/customers" element={<Customers />} />
              <Route path="crm/customers/create" element={<CreateCustomer />} />
              <Route path="crm/customers/:id" element={<CustomerDetails />} />
              <Route path="crm/customers/:id/edit" element={<EditCustomer />} />
              <Route path="crm/leads" element={<Leads />} />
              <Route path="crm/leads/create" element={<CreateLead />} />
              <Route path="crm/leads/:id/edit" element={<EditLead />} />
              <Route path="crm/wallet" element={<Wallet />} />
              <Route path="crm/wallet/:id" element={<WalletDetails />} />
              <Route path="marketing/campaigns" element={<Campaigns />} />
              <Route path="marketing/affiliates" element={<Affiliates />} />
              <Route path="crm/loyalty" element={<LoyaltyRules />} />
              <Route path="hrm" element={<HRMDashboard />} />
              <Route path="hrm/staff" element={<Staff />} />
              <Route path="hrm/staff/create" element={<CreateStaffPage />} />
              <Route path="hrm/staff/:id" element={<StaffProfile />} />
              <Route path="hrm/staff/:id/edit" element={<EditStaff />} />
              <Route path="hrm/departments" element={<Departments />} />
              <Route path="hrm/leaves" element={<Leaves />} />
              <Route path="hrm/attendance" element={<Attendance />} />
              <Route path="hrm/employee-attendance/:id" element={<EmployeeAttendance />} />
              <Route path="hrm/payroll" element={<Payroll />} />
              <Route path="hrm/roles" element={<SettingsRoles />} />
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="finance/banks" element={<Banks />} />
              <Route path="finance/banks/create" element={<CreateBank />} />
              <Route path="finance/banks/:id" element={<BankDetails />} />
              <Route path="finance/banks/:id/edit" element={<EditBank />} />
              <Route path="finance/transactions" element={<Transactions />} />
              <Route path="finance/expenses" element={<Expenses />} />
              <Route path="finance/expenses/create" element={<CreateExpense />} />
              <Route path="finance/expenses/:id/edit" element={<EditExpense />} />
              <Route path="finance/accounts" element={<Accounts />} />
              <Route path="finance/accounts/create" element={<CreateAccount />} />
              <Route path="finance/fixed-assets" element={<FixedAssets />} />
              <Route path="finance/cheques" element={<Cheques />} />
              <Route path="finance/vat-tax" element={<VatTaxLedger />} />
              <Route path="finance/journal-entries" element={<JournalEntries />} />
              <Route path="finance/budgets" element={<Budgets />} />
              <Route path="finance/cost-centers" element={<CostCenters />} />
              <Route path="finance/projects" element={<Projects />} />
              <Route path="finance/fiscal-years" element={<FiscalYears />} />
              <Route path="finance/accounts-payable" element={<AccountsPayable />} />
              <Route path="finance/accounts-receivable" element={<AccountsReceivable />} />
              <Route path="finance/currencies" element={<Currencies />} />
              <Route path="finance/reports/custom" element={<CustomReports />} />
              <Route path="finance/audit" element={<FinanceAudit />} />
              <Route path="finance/reports" element={<ReportsIndex />} />
              <Route path="finance/reports/profit-loss" element={<ProfitLoss />} />
              <Route path="finance/reports/balance-sheet" element={<BalanceSheet />} />
              <Route path="finance/reports/cash-flow" element={<CashFlow />} />
              <Route path="finance/reports/trial-balance" element={<TrialBalance />} />
              <Route path="finance/reports/general-ledger" element={<GeneralLedger />} />
              <Route path="support/tickets" element={<Tickets />} />
              <Route path="support/categories" element={<SupportCategories />} />
              <Route path="cms/banners" element={<Banners />} />
              <Route path="cms/menus" element={<Menus />} />
              <Route path="cms/pages" element={<CMSPages />} />
              <Route path="cms/blog" element={<Blog />} />
              <Route path="cms/media" element={<Media />} />
              <Route path="reports/sales" element={<SalesReport />} />
              <Route path="reports/stock" element={<StockReport />} />
              <Route path="reports/products" element={<ProductReport />} />
              <Route path="reports/customers" element={<CustomerReport />} />
              <Route path="reports/tax" element={<TaxReport />} />
              <Route path="roles" element={<Roles />} />
              <Route path="roles/create" element={<CreateRole />} />
              <Route path="roles/:id/edit" element={<EditRole />} />
              <Route path="permissions" element={<Permissions />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="settings/general" element={<GeneralSettings />} />
              <Route path="settings/payments" element={<PaymentSettings />} />
              <Route path="settings/users" element={<SettingsUsers />} />
              <Route path="settings/permissions" element={<SettingsPermissions />} />
              <Route path="settings/api" element={<APISettings />} />
              <Route path="settings/backup" element={<Backup />} />
              <Route path="settings/taxes" element={<TaxSettings />} />
              <Route path="settings/working-hours" element={<WorkingHoursSettings />} />
            </Route>
          </Route>

          {/* 404 */}
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
        </BrowserRouter>
        </GlobalMediaSelectorProvider>
      </ModalsProvider>
    </MantineProvider>
  )
}

export default App
