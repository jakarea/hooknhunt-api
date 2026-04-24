import { notifications } from '@mantine/notifications'
import { api } from '@/lib/api'

export type BankAccount = {
  id: number
  name: string
  type: 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other'
  accountNumber?: string | null
  accountName?: string | null
  branch?: string | null
  currentBalance: number
  phone?: string | null
  status: 'active' | 'inactive'
  notes?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type BankAccountFilter = {
  type?: 'all' | 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other'
}

export type BankSummaryByType = {
  cash: { count: number; total_balance: number }
  bank: { count: number; total_balance: number }
  bkash: { count: number; total_balance: number }
  nagad: { count: number; total_balance: number }
  rocket: { count: number; total_balance: number }
}

export type BankSummary = {
  totalBalance: number
  accountCount: number
  byType: BankSummaryByType
}

export type BankFilters = {
  search?: string
  type?: BankAccountFilter['type']
  status?: 'active' | 'inactive'
}

// ============================================
// BANK ACCOUNTS API METHODS
// ============================================

/**
 * Get all bank accounts with optional filters
 * GET /api/v2/finance/banks
 */
export const getBanks = async (filters?: BankFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type)
  if (filters?.status) params.append('status', filters.status)

  const response = await api.get(`finance/banks?${params}`)
  return response.data
}

/**
 * Create a new bank account
 * POST /api/v2/finance/banks
 */
export const createBank = async (data: {
  name: string
  type: 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other'
  account_number?: string
  account_name?: string
  branch?: string
  initial_balance?: number
  phone?: string
  notes?: string
}) => {
  const response = await api.post('finance/banks', data)
  return response.data
}

/**
 * Get single bank account by ID
 * GET /api/v2/finance/banks/{id}
 */
export const getBank = async (id: number) => {
  const response = await api.get(`finance/banks/${id}`)
  return response.data
}

/**
 * Update bank account
 * PUT/PATCH /api/v2/finance/banks/{id}
 */
export const updateBank = async (id: number, data: {
  name?: string
  type?: 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other'
  account_number?: string
  account_name?: string
  branch?: string
  phone?: string
  notes?: string
  is_active?: boolean
}) => {
  const response = await api.put(`finance/banks/${id}`, data)
  return response.data
}

/**
 * Delete bank account
 * DELETE /api/v2/finance/banks/{id}
 */
export const deleteBank = async (id: number) => {
  const response = await api.delete(`finance/banks/${id}`)
  return response.data
}

/**
 * Get banks summary for dashboard
 * GET /api/v2/finance/banks/summary
 */
export const getBanksSummary = async () => {
  const response = await api.get('finance/banks/summary')
  return response.data
}

/**
 * Get payment accounts (bank accounts linked to chart of accounts)
 * Used for expense payment account dropdown
 * GET /api/v2/finance/payment-accounts
 */
export const getPaymentAccounts = async () => {
  const response = await api.get('finance/payment-accounts')
  return response.data
}

// ============================================
// BANK TRANSACTION API METHODS
// ============================================

export type BankTransaction = {
  id: number
  bankId: number
  bank: {
    id: number
    name: string
    type: string
  }
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out'
  amount: string
  balanceBefore: string
  balanceAfter: string
  referenceNumber?: string | null
  description: string
  transactionDate: string
  createdAt: string
}

export type TransactionType = 'all' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'expense' | 'bank'

export type TransactionFilters = {
  search?: string
  bank_id?: number | null
  type?: TransactionType
  start_date?: string
  end_date?: string
}

/**
 * Get all bank transactions
 * GET /api/v2/finance/bank-transactions
 */
export const getBankTransactions = async (filters?: TransactionFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.bank_id) params.append('bank_id', filters.bank_id)
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/bank-transactions?${params}`)
  return response.data
}

/**
 * Get bank transaction statistics
 * GET /api/v2/finance/bank-transactions/statistics
 */
export const getBankTransactionStatistics = async (filters?: {
  start_date?: string
  end_date?: string
  bank_id?: number
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.bank_id) params.append('bank_id', filters.bank_id)

  const response = await api.get(`finance/bank-transactions/statistics?${params}`)
  return response.data
}

/**
 * Create deposit transaction
 * POST /api/v2/finance/banks/{id}/deposit
 */
export const createDeposit = async (bankId: number, data: {
  amount: number
  transaction_date: string
  description?: string
  reference_number?: string
}) => {
  const response = await api.post(`finance/banks/${bankId}/deposit`, data)
  return response.data
}

/**
 * Create withdrawal transaction
 * POST /api/v2/finance/banks/{id}/withdraw
 */
export const createWithdrawal = async (bankId: number, data: {
  amount: number
  transaction_date: string
  account_id: number
  description?: string
  reference_number?: string
}) => {
  const response = await api.post(`finance/banks/${bankId}/withdraw`, data)
  return response.data
}

/**
 * Create transfer transaction
 * POST /api/v2/finance/banks/transfer
 */
export const createTransfer = async (fromBankId: number, data: {
  from_bank_id: number
  to_bank_id: number
  amount: number
  transaction_date: string
  description?: string
  reference_number?: string
}) => {
  const response = await api.post(`finance/banks/transfer`, { ...data, from_bank_id: fromBankId })
  return response.data
}

// ============================================
// UNIFIED TRANSACTIONS API METHODS (Bank + Expenses)
// ============================================

export type UnifiedTransaction = {
  id: string // 'bt_123' for bank transactions, 'exp_456' for expenses
  transactionType: 'bank_transaction' | 'expense'
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'expense'
  transactionDate: string | null
  description: string
  referenceNumber?: string | null
  amount: number
  balanceBefore: number | null
  balanceAfter: number | null
  bank: {
    id: number
    name: string
  } | null
  createdBy: {
    id: number
    name: string
  } | null
  transactionableType: string
  transactionableId: number
  createdAt: string | null
  expenseData?: {
    account: {
      id: number
      name: string
    } | null
    vatAmount: number
    taxAmount: number
  }
}

export type UnifiedTransactionFilters = {
  search?: string
  bank_id?: number | null
  type?: TransactionType
  start_date?: string
  end_date?: string
  per_page?: number
  page?: number
}

/**
 * Get all transactions (bank + expenses)
 * GET /api/v2/finance/transactions
 */
export const getTransactions = async (filters?: UnifiedTransactionFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.bank_id) params.append('bank_id', filters.bank_id)
  if (filters?.type && filters.type !== 'all') params.append('type', filters.type)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())
  if (filters?.page) params.append('page', filters.page.toString())

  const response = await api.get(`finance/transactions${params.toString() ? '?' + params.toString() : ''}`)
  return response.data
}

/**
 * Get unified transaction statistics
 * GET /api/v2/finance/transactions/statistics
 */
export const getTransactionStatistics = async (filters?: {
  start_date?: string
  end_date?: string
  bank_id?: number
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.bank_id) params.append('bank_id', filters.bank_id)

  const response = await api.get(`finance/transactions/statistics${params.toString() ? '?' + params.toString() : ''}`)
  return response.data
}

// ============================================
// CHART OF ACCOUNTS API METHODS
// ============================================

export type ChartOfAccount = {
  id: number
  name: string
  code: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  balance: number
  is_active: boolean
  parent_id?: number | null
  description?: string | null
}

/**
 * Get all chart of accounts
 * GET /api/v2/finance/accounts
 */
export const getAccounts = async () => {
  const response = await api.get('finance/accounts')
  return response.data
}

/**
 * Get single chart of account by ID
 * GET /api/v2/finance/accounts/{id}
 */
export const getAccount = async (id: number) => {
  const response = await api.get(`finance/accounts/${id}`)
  return response.data
}

/**
 * Create new chart of account
 * POST /api/v2/finance/accounts
 */
export const createAccount = async (data: {
  name: string
  code: string
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense'
  description?: string
  is_active?: boolean
}) => {
  // Convert 'revenue' to 'income' for backend
  const payload = {
    name: data.name,
    code: data.code,
    type: data.type === 'revenue' ? 'income' : data.type,
    description: data.description,
    is_active: data.is_active ?? true,
  }
  const response = await api.post('finance/accounts', payload)
  return response.data
}

/**
 * Update chart of account
 * PUT/PATCH /api/v2/finance/accounts/{id}
 */
export const updateAccount = async (id: number, data: {
  name?: string
  code?: string
  type?: string
  description?: string
  is_active?: boolean
}) => {
  const payload: any = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.code !== undefined) payload.code = data.code
  if (data.type !== undefined) payload.type = data.type === 'revenue' ? 'income' : data.type
  if (data.description !== undefined) payload.description = data.description
  if (data.is_active !== undefined) payload.is_active = data.is_active

  const response = await api.put(`finance/accounts/${id}`, payload)
  return response.data
}

/**
 * Delete chart of account
 * DELETE /api/v2/finance/accounts/{id}
 */
export const deleteAccount = async (id: number) => {
  const response = await api.delete(`finance/accounts/${id}`)
  return response.data
}

/**
 * Get balance summary
 * GET /api/v2/finance/accounts/summary
 */
export const getAccountBalanceSummary = async () => {
  const response = await api.get('finance/accounts/summary')
  return response.data
}

/**
 * Get trial balance
 * GET /api/v2/finance/accounts/trial-balance
 */
export const getTrialBalance = async (params?: {
  as_of_date?: string
  include_zero_balance?: boolean
}) => {
  const response = await api.get('finance/accounts/trial-balance', { params })
  return response.data
}

/**
 * Get account statistics
 * GET /api/v2/finance/accounts/statistics
 */
export const getAccountStatistics = async () => {
  const response = await api.get('finance/accounts/statistics')
  return response.data
}

// ============================================
// ACCOUNTS PAYABLE API METHODS
// ============================================

export type VendorBill = {
  id: number
  bill_number: string
  supplier_id: number
  supplier?: any
  supplier_name?: string
  chart_account_id?: number | null
  chart_account?: any
  account_name?: string
  bill_date: string
  due_date: string
  subtotal: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  status: 'draft' | 'open' | 'partial' | 'paid' | 'overdue'
  status_label?: string
  payment_status: 'unpaid' | 'partial' | 'paid'
  payment_status_label?: string
  notes?: string | null
  created_by?: number | null
  creator?: any
  paid_at?: string | null
  is_overdue?: boolean
  days_overdue?: number
  items?: VendorBillItem[]
  created_at: string
  updated_at: string
}

export type VendorBillItem = {
  id: number
  vendor_bill_id: number
  description: string
  quantity: number
  unit_price: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  chart_account_id?: number | null
  chart_account?: any
}

export type VendorPayment = {
  id: number
  payment_number: string
  supplier_id: number
  supplier?: any
  chart_account_id?: number | null
  chart_account?: any
  payment_date: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card'
  payment_method_label?: string
  reference_number?: string | null
  notes?: string | null
  status: 'draft' | 'completed' | 'cancelled'
  status_label?: string
  created_by?: number | null
  creator?: any
  bills?: any[]
  created_at: string
  updated_at: string
}

export type AccountsPayableFilters = {
  page?: number
  per_page?: number
  status?: string
  payment_status?: string
  supplier_id?: number
  start_date?: string
  end_date?: string
  search?: string
}

export type AgingReport = {
  as_of_date: string
  total_due: number
  aging: {
    current: { count: number; amount: number }
    '1_30_days': { count: number; amount: number }
    '31_60_days': { count: number; amount: number }
    '61_90_days': { count: number; amount: number }
    over_90_days: { count: number; amount: number }
  }
  by_supplier: Array<{
    supplier_id: number
    supplier_name: string
    total_due: number
    current: number
    '1_30_days': number
    '31_60_days': number
    '61_90_days': number
    over_90_days: number
  }>
  total_unpaid_bills: number
}

export type AccountsPayableStatistics = {
  total_bills: number
  unpaid_bills: number
  partial_bills: number
  paid_bills: number
  overdue_bills: number
  total_due: number
  total_paid_this_month: number
}

/**
 * Get all vendor bills
 * GET /api/v2/finance/accounts-payable
 */
export const getVendorBills = async (filters?: AccountsPayableFilters) => {
  const response = await api.get('finance/accounts-payable', { params: filters })
  return response.data
}

/**
 * Get single vendor bill
 * GET /api/v2/finance/accounts-payable/{id}
 */
export const getVendorBill = async (id: number) => {
  const response = await api.get(`finance/accounts-payable/${id}`)
  return response.data
}

/**
 * Create new vendor bill
 * POST /api/v2/finance/accounts-payable
 */
export const createVendorBill = async (data: {
  supplier_id: number
  chart_account_id?: number | null
  bill_date: string
  due_date: string
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    tax_rate?: number
    discount_amount?: number
    chart_account_id?: number | null
  }>
  notes?: string
}) => {
  const response = await api.post('finance/accounts-payable', data)
  return response.data
}

/**
 * Update vendor bill
 * PUT/PATCH /api/v2/finance/accounts-payable/{id}
 */
export const updateVendorBill = async (id: number, data: {
  supplier_id?: number
  chart_account_id?: number | null
  bill_date?: string
  due_date?: string
  notes?: string
}) => {
  const response = await api.put(`finance/accounts-payable/${id}`, data)
  return response.data
}

/**
 * Delete vendor bill
 * DELETE /api/v2/finance/accounts-payable/{id}
 */
export const deleteVendorBill = async (id: number) => {
  const response = await api.delete(`finance/accounts-payable/${id}`)
  return response.data
}

/**
 * Get aging report
 * GET /api/v2/finance/accounts-payable/aging-report
 */
export const getAgingReport = async (asOfDate?: string) => {
  const response = await api.get('finance/accounts-payable/aging-report', {
    params: asOfDate ? { as_of_date: asOfDate } : {}
  })
  return response.data
}

/**
 * Get vendor payments
 * GET /api/v2/finance/accounts-payable/payments
 */
export const getVendorPayments = async (filters?: {
  page?: number
  per_page?: number
  status?: string
  supplier_id?: number
  start_date?: string
  end_date?: string
}) => {
  const response = await api.get('finance/accounts-payable/payments', { params: filters })
  return response.data
}

/**
 * Create vendor payment
 * POST /api/v2/finance/accounts-payable/payments
 */
export const createVendorPayment = async (data: {
  supplier_id: number
  chart_account_id?: number | null
  payment_date: string
  amount: number
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'card'
  reference_number?: string
  notes?: string
  bills: Array<{
    bill_id: number
    amount_applied: number
  }>
}) => {
  const response = await api.post('finance/accounts-payable/payments', data)
  return response.data
}

/**
 * Get accounts payable statistics
 * GET /api/v2/finance/accounts-payable/statistics
 */
export const getAccountsPayableStatistics = async () => {
  const response = await api.get('finance/accounts-payable/statistics')
  return response.data
}

// ============================================
// FINANCE DASHBOARD API METHODS
// ============================================

export type DashboardSummary = {
  banks_summary: {
    total_balance: number
    account_count: number
    by_type: BankSummaryByType
  }
  recent_transactions: BankTransaction[]
  expenses: {
    pending_count: number
    pending_amount: number
  }
  revenue_vs_expenses: {
    revenue: number
    expenses: number
    net_income: number
    start_date: string
    end_date: string
  }
}

/**
 * Get finance dashboard summary
 * GET /api/v2/finance/dashboard
 */
export const getFinanceDashboard = async () => {
  const response = await api.get('finance/dashboard')
  return response.data
}

// ============================================
// EXPENSES API METHODS
// ============================================

export type Expense = {
  id: number
  title: string
  amount: string  // API returns string
  expenseDate: string
  isApproved: boolean  // API returns 0/1, convert to boolean
  accountId: number
  account?: {
    id: number
    name: string
    code: string
    type: string
  }
  paidById: number
  paidBy?: {
    id: number
    name: string
    email?: string
  }
  referenceNumber?: string | null
  notes?: string | null
  attachment?: string | null
  // VAT (Value Added Tax) fields - optional
  vatPercentage?: number | null
  vatAmount?: string | null
  vatChallanNo?: string | null
  // Tax (AIT) fields - optional
  taxPercentage?: number | null
  taxAmount?: string | null
  taxChallanNo?: string | null
  createdAt: string
  updatedAt: string
}

export type ExpenseFilters = {
  search?: string
  account_id?: number
  is_approved?: boolean
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

/**
 * Get all expenses
 * GET /api/v2/finance/expenses
 */
export const getExpenses = async (filters?: ExpenseFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.account_id) params.append('account_id', filters.account_id.toString())
  if (filters?.is_approved !== undefined) params.append('is_approved', filters.is_approved ? '1' : '0')
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  // Pagination
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await api.get(`finance/expenses?${params}`)
  return response.data
}

/**
 * Get single expense
 * GET /api/v2/finance/expenses/{id}
 */
export const getExpense = async (id: number) => {
  const response = await api.get(`finance/expenses/${id}`)
  return response.data
}

/**
 * Create expense
 * POST /api/v2/finance/expenses
 */
export const createExpense = async (data: {
  title: string
  amount: number
  accountId: number
  paymentAccountId?: number | null
  expenseDate: string
  referenceNumber?: string
  notes?: string
  attachment?: string | File
  // VAT fields
  vatPercentage?: number | null
  vatAmount?: number | null
  vatChallanNo?: string | null
  // Tax fields
  taxPercentage?: number | null
  taxAmount?: number | null
  taxChallanNo?: string | null
}) => {
  const payload: any = {
    title: data.title,
    amount: data.amount,
    account_id: data.accountId,
    payment_account_id: data.paymentAccountId,
    expense_date: data.expenseDate,
    reference_number: data.referenceNumber,
    notes: data.notes,
    attachment: data.attachment,
  }
  // VAT fields
  if (data.vatPercentage !== undefined) payload.vat_percentage = data.vatPercentage
  if (data.vatAmount !== undefined) payload.vat_amount = data.vatAmount
  if (data.vatChallanNo !== undefined) payload.vat_challan_no = data.vatChallanNo
  // Tax fields
  if (data.taxPercentage !== undefined) payload.tax_percentage = data.taxPercentage
  if (data.taxAmount !== undefined) payload.tax_amount = data.taxAmount
  if (data.taxChallanNo !== undefined) payload.tax_challan_no = data.taxChallanNo

  const response = await api.post('finance/expenses', payload)
  return response.data
}

/**
 * Approve expense
 * POST /api/v2/finance/expenses/{id}/approve
 */
export const approveExpense = async (id: number) => {
  const response = await api.post(`finance/expenses/${id}/approve`)
  return response.data
}

/**
 * Update expense
 * PUT/PATCH /api/v2/finance/expenses/{id}
 */
export const updateExpense = async (id: number, data: {
  title?: string
  amount?: number
  accountId?: number
  paymentAccountId?: number | null
  expenseDate?: string
  referenceNumber?: string
  notes?: string
  attachment?: string | File
  // VAT fields
  vatPercentage?: number | null
  vatAmount?: number | null
  vatChallanNo?: string | null
  // Tax fields
  taxPercentage?: number | null
  taxAmount?: number | null
  taxChallanNo?: string | null
}) => {
  const payload: any = {}
  if (data.title !== undefined) payload.title = data.title
  if (data.amount !== undefined) payload.amount = data.amount
  if (data.accountId !== undefined) payload.account_id = data.accountId
  if (data.paymentAccountId !== undefined) payload.payment_account_id = data.paymentAccountId
  if (data.expenseDate !== undefined) payload.expense_date = data.expenseDate
  if (data.referenceNumber !== undefined) payload.reference_number = data.referenceNumber
  if (data.notes !== undefined) payload.notes = data.notes
  if (data.attachment !== undefined) payload.attachment = data.attachment
  // VAT fields
  if (data.vatPercentage !== undefined) payload.vat_percentage = data.vatPercentage
  if (data.vatAmount !== undefined) payload.vat_amount = data.vatAmount
  if (data.vatChallanNo !== undefined) payload.vat_challan_no = data.vatChallanNo
  // Tax fields
  if (data.taxPercentage !== undefined) payload.tax_percentage = data.taxPercentage
  if (data.taxAmount !== undefined) payload.tax_amount = data.taxAmount
  if (data.taxChallanNo !== undefined) payload.tax_challan_no = data.taxChallanNo

  const response = await api.put(`finance/expenses/${id}`, payload)
  return response.data
}

/**
 * Delete expense
 * DELETE /api/v2/finance/expenses/{id}
 */
export const deleteExpense = async (id: number) => {
  const response = await api.delete(`finance/expenses/${id}`)
  return response.data
}

// ============================================
// BANK RECONCILIATION API METHODS
// ============================================

export type BankReconciliation = {
  id: number
  bankId: number
  bank?: {
    id: number
    name: string
    type: string
    current_balance: number
  }
  statementDate: string
  statementNumber?: string | null
  openingBalance: number
  closingBalance: number
  bookBalance: number
  depositsInTransit: number
  outstandingChecks: number
  bankCharges: number
  interestEarned: number
  otherAdjustments: number
  adjustedBalance: number
  difference: number
  isReconciled: boolean
  reconciledAt?: string | null
  notes?: string | null
  attachment?: string | null
  createdAt: string
  updatedAt: string
  summary?: {
    book_balance: number
    deposits_in_transit: number
    outstanding_checks: number
    bank_charges: number
    interest_earned: number
    other_adjustments: number
    adjusted_balance: number
    closing_balance: number
    difference: number
    is_balanced: boolean
  }
}

export type ReconciliationFilters = {
  bank_id?: number
  is_reconciled?: boolean
  start_date?: string
  end_date?: string
  page?: number
  per_page?: number
}

/**
 * Get all bank reconciliations
 * GET /api/v2/finance/bank-reconciliations
 */
export const getBankReconciliations = async (filters?: ReconciliationFilters) => {
  const params = new URLSearchParams()

  if (filters?.bank_id) params.append('bank_id', filters.bank_id.toString())
  if (filters?.is_reconciled !== undefined) params.append('is_reconciled', filters.is_reconciled ? '1' : '0')
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await api.get(`finance/bank-reconciliations?${params}`)
  return response.data
}

/**
 * Get single bank reconciliation
 * GET /api/v2/finance/bank-reconciliations/{id}
 */
export const getBankReconciliation = async (id: number) => {
  const response = await api.get(`finance/bank-reconciliations/${id}`)
  return response.data
}

/**
 * Create bank reconciliation
 * POST /api/v2/finance/bank-reconciliations
 */
export const createBankReconciliation = async (data: {
  bank_id: number
  statement_date: string
  statement_number?: string
  opening_balance: number
  closing_balance: number
  deposits_in_transit?: number
  outstanding_checks?: number
  bank_charges?: number
  interest_earned?: number
  other_adjustments?: number
  notes?: string
}) => {
  const response = await api.post('finance/bank-reconciliations', data)
  return response.data
}

/**
 * Update bank reconciliation
 * PUT/PATCH /api/v2/finance/bank-reconciliations/{id}
 */
export const updateBankReconciliation = async (id: number, data: {
  statement_number?: string
  opening_balance?: number
  closing_balance?: number
  deposits_in_transit?: number
  outstanding_checks?: number
  bank_charges?: number
  interest_earned?: number
  other_adjustments?: number
  notes?: string
  attachment?: string
}) => {
  const response = await api.put(`finance/bank-reconciliations/${id}`, data)
  return response.data
}

/**
 * Delete bank reconciliation
 * DELETE /api/v2/finance/bank-reconciliations/{id}
 */
export const deleteBankReconciliation = async (id: number) => {
  const response = await api.delete(`finance/bank-reconciliations/${id}`)
  return response.data
}

/**
 * Reconcile bank statement
 * POST /api/v2/finance/bank-reconciliations/{id}/reconcile
 */
export const reconcileBank = async (id: number) => {
  const response = await api.post(`finance/bank-reconciliations/${id}/reconcile`)
  return response.data
}

/**
 * Reset reconciliation
 * POST /api/v2/finance/bank-reconciliations/{id}/reset
 */
export const resetBankReconciliation = async (id: number) => {
  const response = await api.post(`finance/bank-reconciliations/${id}/reset`)
  return response.data
}

/**
 * Get book balance for a bank
 * GET /api/v2/finance/bank-reconciliations/book-balance/{bankId}
 */
export const getBookBalance = async (bankId: number) => {
  const response = await api.get(`finance/bank-reconciliations/book-balance/${bankId}`)
  return response.data
}

/**
 * Get pending transactions for reconciliation
 * GET /api/v2/finance/bank-reconciliations/pending-transactions/{bankId}
 */
export const getPendingTransactions = async (bankId: number, statementDate: string) => {
  const response = await api.get(`finance/bank-reconciliations/pending-transactions/${bankId}?statement_date=${statementDate}`)
  return response.data
}

/**
 * Get reconciliation summary
 * GET /api/v2/finance/bank-reconciliations/summary
 */
export const getReconciliationSummary = async (filters?: {
  start_date?: string
  end_date?: string
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/bank-reconciliations/summary?${params}`)
  return response.data
}

// ============================================
// FIXED ASSETS API METHODS
// ============================================

export type FixedAsset = {
  id: number
  name: string
  assetCode: string
  serialNumber?: string | null
  description?: string | null
  category: string
  subcategory?: string | null
  location?: string | null
  accountId?: number | null
  account?: {
    id: number
    name: string
    code: string
    type: string
  }
  purchasePrice: number
  purchaseDate: string
  supplier?: string | null
  invoiceNumber?: string | null
  salvageValue: number
  usefulLife: number
  depreciationMethod: 'straight_line' | 'declining_balance' | 'units_of_production' | 'none'
  depreciationRate: number
  accumulatedDepreciation: number
  netBookValue: number
  status: 'active' | 'disposed' | 'sold' | 'scrapped' | 'lost'
  disposalDate?: string | null
  disposalValue?: number | null
  disposalReason?: string | null
  disposalReference?: string | null
  warrantyExpiry?: string | null
  maintenanceNotes?: string | null
  attachment?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  // Computed fields
  remainingLife?: number
  depreciationProgress?: number
  depreciationSchedule?: Array<{
    year: number
    depreciation: number
    accumulated: number
    bookValue: number
  }>
  isFullyDepreciated?: boolean
}

export type FixedAssetFilters = {
  category?: string
  status?: 'active' | 'disposed' | 'sold' | 'scrapped' | 'lost'
  location?: string
  search?: string
  start_date?: string
  end_date?: string
}

/**
 * Get all fixed assets with optional filters
 * GET /api/v2/finance/fixed-assets
 */
export const getFixedAssets = async (filters?: FixedAssetFilters) => {
  const params = new URLSearchParams()

  if (filters?.category) params.append('category', filters.category)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.location) params.append('location', filters.location)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/fixed-assets?${params}`)
  return response.data
}

/**
 * Get a single fixed asset
 * GET /api/v2/finance/fixed-assets/{id}
 */
export const getFixedAsset = async (id: number) => {
  const response = await api.get(`finance/fixed-assets/${id}`)
  return response.data
}

/**
 * Create a new fixed asset
 * POST /api/v2/finance/fixed-assets
 */
export const createFixedAsset = async (data: {
  name: string
  category: string
  subcategory?: string
  location?: string
  serial_number?: string
  description?: string
  account_id?: number
  purchase_price: number
  purchase_date: string
  supplier?: string
  invoice_number?: string
  salvage_value?: number
  useful_life: number
  depreciation_method: 'straight_line' | 'declining_balance' | 'units_of_production' | 'none'
  depreciation_rate?: number
  warranty_expiry?: string
  attachment?: string
  notes?: string
}) => {
  const response = await api.post('finance/fixed-assets', data)
  return response.data
}

/**
 * Update a fixed asset
 * PUT/PATCH /api/v2/finance/fixed-assets/{id}
 */
export const updateFixedAsset = async (id: number, data: {
  name?: string
  category?: string
  subcategory?: string
  location?: string
  serial_number?: string
  description?: string
  account_id?: number
  purchase_price?: number
  purchase_date?: string
  supplier?: string
  invoice_number?: string
  salvage_value?: number
  useful_life?: number
  depreciation_method?: 'straight_line' | 'declining_balance' | 'units_of_production' | 'none'
  depreciation_rate?: number
  warranty_expiry?: string
  attachment?: string
  notes?: string
}) => {
  const response = await api.put(`finance/fixed-assets/${id}`, data)
  return response.data
}

/**
 * Delete a fixed asset
 * DELETE /api/v2/finance/fixed-assets/{id}
 */
export const deleteFixedAsset = async (id: number) => {
  const response = await api.delete(`finance/fixed-assets/${id}`)
  return response.data
}

/**
 * Dispose/Sell/Scrap an asset
 * POST /api/v2/finance/fixed-assets/{id}/dispose
 */
export const disposeFixedAsset = async (id: number, data: {
  status: 'disposed' | 'sold' | 'scrapped' | 'lost'
  disposal_date: string
  disposal_value?: number
  disposal_reason?: string
  disposal_reference?: string
}) => {
  const response = await api.post(`finance/fixed-assets/${id}/dispose`, data)
  return response.data
}

/**
 * Update depreciation for all assets
 * POST /api/v2/finance/fixed-assets/update-depreciation
 */
export const updateAllDepreciation = async () => {
  const response = await api.post('finance/fixed-assets/update-depreciation')
  return response.data
}

/**
 * Get asset categories
 * GET /api/v2/finance/fixed-assets/categories
 */
export const getAssetCategories = async () => {
  const response = await api.get('finance/fixed-assets/categories')
  return response.data
}

/**
 * Get asset locations
 * GET /api/v2/finance/fixed-assets/locations
 */
export const getAssetLocations = async () => {
  const response = await api.get('finance/fixed-assets/locations')
  return response.data
}

/**
 * Get fixed assets summary
 * GET /api/v2/finance/fixed-assets/summary
 */
export const getFixedAssetsSummary = async (filters?: {
  start_date?: string
  end_date?: string
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/fixed-assets/summary?${params}`)
  return response.data
}

// ============================================
// CHEQUE/PDC MANAGEMENT API METHODS
// ============================================

export type Cheque = {
  id: number
  chequeNumber: string
  issueDate: string
  dueDate: string
  amount: number
  payeeName: string
  bankId?: number | null
  bank?: {
    id: number
    name: string
    type: string
  }
  bankName?: string | null
  branchName?: string | null
  type: 'incoming' | 'outgoing'
  referenceType?: string | null
  referenceId?: number | null
  status: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled' | 'dishonored'
  depositDate?: string | null
  clearanceDate?: string | null
  bounceReason?: string | null
  partyName?: string | null
  partyContact?: string | null
  notes?: string | null
  attachment?: string | null
  alertSent: boolean
  alertSentAt?: string | null
  createdAt: string
  updatedAt: string
  // Computed fields
  days_until_due?: number
  is_due_today?: boolean
  is_overdue?: boolean
  is_upcoming?: boolean
}

export type ChequeFilters = {
  type?: 'incoming' | 'outgoing'
  status?: 'pending' | 'deposited' | 'cleared' | 'bounced' | 'cancelled' | 'dishonored'
  bank_id?: number
  search?: string
  start_date?: string
  end_date?: string
}

/**
 * Get all cheques with optional filters
 * GET /api/v2/finance/cheques
 */
export const getCheques = async (filters?: ChequeFilters) => {
  const params = new URLSearchParams()

  if (filters?.type) params.append('type', filters.type)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.bank_id) params.append('bank_id', filters.bank_id.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/cheques?${params}`)
  return response.data
}

/**
 * Get a single cheque
 * GET /api/v2/finance/cheques/{id}
 */
export const getCheque = async (id: number) => {
  const response = await api.get(`finance/cheques/${id}`)
  return response.data
}

/**
 * Create a new cheque
 * POST /api/v2/finance/cheques
 */
export const createCheque = async (data: {
  cheque_number: string
  issue_date: string
  due_date: string
  amount: number
  payee_name: string
  bank_id?: number
  branch_name?: string
  type: 'incoming' | 'outgoing'
  reference_type?: string
  reference_id?: number
  party_name?: string
  party_contact?: string
  notes?: string
  attachment?: string
}) => {
  const response = await api.post('finance/cheques', data)
  return response.data
}

/**
 * Update a cheque
 * PUT/PATCH /api/v2/finance/cheques/{id}
 */
export const updateCheque = async (id: number, data: {
  cheque_number?: string
  issue_date?: string
  due_date?: string
  amount?: number
  payee_name?: string
  bank_id?: number
  branch_name?: string
  party_name?: string
  party_contact?: string
  notes?: string
  attachment?: string
}) => {
  const response = await api.put(`finance/cheques/${id}`, data)
  return response.data
}

/**
 * Delete a cheque
 * DELETE /api/v2/finance/cheques/{id}
 */
export const deleteCheque = async (id: number) => {
  const response = await api.delete(`finance/cheques/${id}`)
  return response.data
}

/**
 * Mark cheque as deposited
 * POST /api/v2/finance/cheques/{id}/deposit
 */
export const depositCheque = async (id: number, data?: { deposit_date?: string }) => {
  const response = await api.post(`finance/cheques/${id}/deposit`, data || {})
  return response.data
}

/**
 * Mark cheque as cleared
 * POST /api/v2/finance/cheques/{id}/clear
 */
export const clearCheque = async (id: number, data?: { clearance_date?: string }) => {
  const response = await api.post(`finance/cheques/${id}/clear`, data || {})
  return response.data
}

/**
 * Mark cheque as bounced
 * POST /api/v2/finance/cheques/{id}/bounce
 */
export const bounceCheque = async (id: number, data: { bounce_reason: string }) => {
  const response = await api.post(`finance/cheques/${id}/bounce`, data)
  return response.data
}

/**
 * Cancel cheque
 * POST /api/v2/finance/cheques/{id}/cancel
 */
export const cancelCheque = async (id: number) => {
  const response = await api.post(`finance/cheques/${id}/cancel`)
  return response.data
}

/**
 * Get cheque alerts (upcoming and overdue)
 * GET /api/v2/finance/cheques/alerts?days=7
 */
export const getChequeAlerts = async (days: number = 7) => {
  const response = await api.get(`finance/cheques/alerts?days=${days}`)
  return response.data
}

/**
 * Get cheques summary
 * GET /api/v2/finance/cheques/summary
 */
export const getChequesSummary = async () => {
  const response = await api.get('finance/cheques/summary')
  return response.data
}

// ============================================
// VAT/TAX LEDGER API METHODS
// ============================================

export type VatTaxLedger = {
  id: number
  transactionType: 'purchase' | 'sale' | 'expense' | 'adjustment'
  taxType: 'vat' | 'tax' | 'ait'
  baseAmount: number
  taxRate: number
  taxAmount: number
  direction: 'input' | 'output'
  flowType: 'debit' | 'credit'
  transactionDate: string
  chartAccountId?: number
  fiscalYear?: string
  taxPeriod?: string
  challanNumber?: string
  challanDate?: string
  isPaid: boolean
  paymentDate?: string
  paymentReference?: string
  status: 'pending' | 'filed' | 'paid'
  description?: string
  notes?: string
  taxTypeLabel?: string
  directionLabel?: string
  statusLabel?: string
  statusBadge?: string
  chartAccount?: any
  creator?: any
  updater?: any
  createdAt: string
  updatedAt: string
}

export type VatTaxLedgerFilters = {
  tax_type?: 'vat' | 'tax' | 'ait'
  direction?: 'input' | 'output'
  status?: 'pending' | 'filed' | 'paid'
  fiscal_year?: string
  tax_period?: string
  transaction_type?: 'purchase' | 'sale' | 'expense' | 'adjustment'
  is_paid?: boolean
  search?: string
  start_date?: string
  end_date?: string
}

export type VatTaxSummary = {
  by_type_and_direction: any[]
  vat: {
    collected: number
    paid: number
    net: number
  }
  tax: {
    collected: number
    paid: number
    net: number
  }
  total: {
    collected: number
    paid: number
    net_payable: number
  }
  transaction_counts: {
    total: number
    pending: number
    filed: number
    paid: number
  }
}

/**
 * Get all VAT/Tax ledger entries with optional filters
 * GET /api/v2/finance/vat-tax-ledgers
 */
export const getVatTaxLedgers = async (filters?: VatTaxLedgerFilters) => {
  const params = new URLSearchParams()

  if (filters?.tax_type) params.append('tax_type', filters.tax_type)
  if (filters?.direction) params.append('direction', filters.direction)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.fiscal_year) params.append('fiscal_year', filters.fiscal_year)
  if (filters?.tax_period) params.append('tax_period', filters.tax_period)
  if (filters?.transaction_type) params.append('transaction_type', filters.transaction_type)
  if (filters?.is_paid !== undefined) params.append('is_paid', filters.is_paid.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/vat-tax-ledgers?${params}`)
  return response.data
}

/**
 * Get a single VAT/Tax ledger entry
 * GET /api/v2/finance/vat-tax-ledgers/{id}
 */
export const getVatTaxLedger = async (id: number) => {
  const response = await api.get(`finance/vat-tax-ledgers/${id}`)
  return response.data
}

/**
 * Create a new VAT/Tax ledger entry
 * POST /api/v2/finance/vat-tax-ledgers
 */
export const createVatTaxLedger = async (data: {
  transaction_type: 'purchase' | 'sale' | 'expense' | 'adjustment'
  tax_type: 'vat' | 'tax' | 'ait'
  base_amount: number
  tax_rate: number
  tax_amount: number
  direction: 'input' | 'output'
  flow_type: 'debit' | 'credit'
  transaction_date: string
  chart_account_id?: number
  fiscal_year?: string
  tax_period?: string
  challan_number?: string
  challan_date?: string
  reference_type?: string
  reference_id?: number
  description?: string
  notes?: string
}) => {
  const response = await api.post('finance/vat-tax-ledgers', data)
  return response.data
}

/**
 * Update a VAT/Tax ledger entry
 * PUT/PATCH /api/v2/finance/vat-tax-ledgers/{id}
 */
export const updateVatTaxLedger = async (id: number, data: {
  transaction_type?: 'purchase' | 'sale' | 'expense' | 'adjustment'
  base_amount?: number
  tax_rate?: number
  tax_amount?: number
  flow_type?: 'debit' | 'credit'
  transaction_date?: string
  chart_account_id?: number
  fiscal_year?: string
  tax_period?: string
  challan_number?: string
  challan_date?: string
  description?: string
  notes?: string
}) => {
  const response = await api.put(`finance/vat-tax-ledgers/${id}`, data)
  return response.data
}

/**
 * Delete a VAT/Tax ledger entry
 * DELETE /api/v2/finance/vat-tax-ledgers/{id}
 */
export const deleteVatTaxLedger = async (id: number) => {
  const response = await api.delete(`finance/vat-tax-ledgers/${id}`)
  return response.data
}

/**
 * Mark VAT/Tax entry as filed
 * POST /api/v2/finance/vat-tax-ledgers/{id}/mark-filed
 */
export const markVatTaxAsFiled = async (id: number, data: {
  filing_date?: string
  acknowledgement_number?: string
}) => {
  const response = await api.post(`finance/vat-tax-ledgers/${id}/mark-filed`, data)
  return response.data
}

/**
 * Mark VAT/Tax entry as paid
 * POST /api/v2/finance/vat-tax-ledgers/{id}/mark-paid
 */
export const markVatTaxAsPaid = async (id: number, data: {
  payment_date: string
  payment_reference: string
}) => {
  const response = await api.post(`finance/vat-tax-ledgers/${id}/mark-paid`, data)
  return response.data
}

/**
 * Get VAT/Tax summary statistics
 * GET /api/v2/finance/vat-tax-ledgers/summary
 */
export const getVatTaxSummary = async (filters?: {
  start_date?: string
  end_date?: string
  fiscal_year?: string
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.fiscal_year) params.append('fiscal_year', filters.fiscal_year)

  const response = await api.get(`finance/vat-tax-ledgers/summary?${params}`)
  return response.data
}

/**
 * Get net VAT/Tax calculation
 * GET /api/v2/finance/vat-tax-ledgers/net-calculation
 */
export const getVatTaxNetCalculation = async (fiscalYear?: string) => {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : ''
  const response = await api.get(`finance/vat-tax-ledgers/net-calculation${params}`)
  return response.data
}

/**
 * Get VAT/Tax entries grouped by period
 * GET /api/v2/finance/vat-tax-ledgers/by-period
 */
export const getVatTaxByPeriod = async (filters?: {
  fiscal_year?: string
  tax_type?: 'vat' | 'tax' | 'ait'
}) => {
  const params = new URLSearchParams()

  if (filters?.fiscal_year) params.append('fiscal_year', filters.fiscal_year)
  if (filters?.tax_type) params.append('tax_type', filters.tax_type)

  const response = await api.get(`finance/vat-tax-ledgers/by-period?${params}`)
  return response.data
}

// ============================================
// JOURNAL ENTRY API METHODS
// ============================================

export type JournalItem = {
  id: number
  journal_entry_id: number
  account_id: number
  debit: number
  credit: number
  account?: {
    id: number
    account_name: string
    account_code: string
    account_type: string
  }
}

export type JournalEntry = {
  id: number
  entry_number: string
  date: string
  description?: string
  reference_type?: string
  reference_id?: number
  is_reversed: boolean
  created_by: number
  creator?: {
    id: number
    name: string
    email: string
  }
  items?: JournalItem[]
  total_debit?: number
  total_credit?: number
  is_balanced?: boolean
  created_at: string
  updated_at: string
}

export type JournalEntryFilters = {
  start_date?: string
  end_date?: string
  entry_number?: string
  is_reversed?: boolean
  reference_type?: string
  reference_id?: number
  search?: string
  page?: number
  per_page?: number
}

/**
 * Get all journal entries with filters
 * GET /api/v2/finance/journal-entries
 */
export const getJournalEntries = async (filters?: JournalEntryFilters) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.entry_number) params.append('entry_number', filters.entry_number)
  if (filters?.is_reversed !== undefined) params.append('is_reversed', filters.is_reversed ? '1' : '0')
  if (filters?.reference_type) params.append('reference_type', filters.reference_type)
  if (filters?.reference_id) params.append('reference_id', filters.reference_id.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/journal-entries${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get single journal entry
 * GET /api/v2/finance/journal-entries/{id}
 */
export const getJournalEntry = async (id: number) => {
  const response = await api.get(`finance/journal-entries/${id}`)
  return response.data
}

/**
 * Create new journal entry
 * POST /api/v2/finance/journal-entries
 */
export const createJournalEntry = async (data: {
  entry_number: string
  date: string
  description?: string
  reference_type?: string
  reference_id?: number
  items: {
    account_id: number
    debit: number
    credit: number
  }[]
}) => {
  const response = await api.post('finance/journal-entries', data)
  return response.data
}

/**
 * Update journal entry
 * PUT /api/v2/finance/journal-entries/{id}
 */
export const updateJournalEntry = async (id: number, data: {
  entry_number?: string
  date?: string
  description?: string
  items?: {
    account_id: number
    debit: number
    credit: number
  }[]
}) => {
  const response = await api.put(`finance/journal-entries/${id}`, data)
  return response.data
}

/**
 * Delete journal entry
 * DELETE /api/v2/finance/journal-entries/{id}
 */
export const deleteJournalEntry = async (id: number) => {
  const response = await api.delete(`finance/journal-entries/${id}`)
  return response.data
}

/**
 * Reverse journal entry
 * POST /api/v2/finance/journal-entries/{id}/reverse
 */
export const reverseJournalEntry = async (id: number, data: {
  reason?: string
}) => {
  const response = await api.post(`finance/journal-entries/${id}/reverse`, data)
  return response.data
}

/**
 * Get journal entries by account (general ledger view)
 * GET /api/v2/finance/journal-entries/by-account
 */
export const getJournalEntriesByAccount = async (accountId: number, filters?: {
  start_date?: string
  end_date?: string
}) => {
  const params = new URLSearchParams()
  params.append('account_id', accountId.toString())

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/journal-entries/by-account?${params}`)
  return response.data
}

/**
 * Get next journal entry number
 * GET /api/v2/finance/journal-entries/next-number
 */
export const getNextJournalEntryNumber = async () => {
  const response = await api.get('finance/journal-entries/next-number')
  return response.data
}

/**
 * Get journal entry statistics
 * GET /api/v2/finance/journal-entries/statistics
 */
export const getJournalEntryStatistics = async (filters?: {
  start_date?: string
  end_date?: string
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const queryString = params.toString()
  const response = await api.get(`finance/journal-entries/statistics${queryString ? `?${queryString}` : ''}`)
  return response.data
}

// ============================================
// BUDGET API METHODS
// ============================================

export type Budget = {
  id: number
  name: string
  description?: string
  account_id?: number
  scope_type: 'company' | 'department' | 'account'
  scope_id?: string
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  fiscal_year: string
  period_name?: string
  start_date: string
  end_date: string
  planned_amount: number
  actual_amount: number
  variance: number
  variance_percentage: number
  status: 'draft' | 'active' | 'completed' | 'exceeded'
  alert_threshold: number
  alert_sent: boolean
  approved_by?: number
  approved_at?: string
  notes?: string
  created_by: number
  updated_by?: number
  created_at: string
  updated_at: string
  // Computed properties
  usage_percentage?: number
  is_exceeded?: boolean
  needs_alert?: boolean
  status_label?: string
  status_badge?: string
  variance_status?: string
  variance_color?: string
  period_type_label?: string
  scope_type_label?: string
  chart_account?: {
    id: number
    account_name: string
    account_code: string
  }
  creator?: {
    id: number
    name: string
  }
  approver?: {
    id: number
    name: string
  }
}

export type BudgetFilters = {
  fiscal_year?: string
  period_type?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  status?: 'draft' | 'active' | 'completed' | 'exceeded'
  scope_type?: 'company' | 'department' | 'account'
  account_id?: number
  search?: string
  active?: boolean
  needing_alert?: boolean
  page?: number
  per_page?: number
}

/**
 * Get all budgets with filters
 * GET /api/v2/finance/budgets
 */
export const getBudgets = async (filters?: BudgetFilters) => {
  const params = new URLSearchParams()

  if (filters?.fiscal_year) params.append('fiscal_year', filters.fiscal_year)
  if (filters?.period_type) params.append('period_type', filters.period_type)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.scope_type) params.append('scope_type', filters.scope_type)
  if (filters?.account_id) params.append('account_id', filters.account_id.toString())
  if (filters?.search) params.append('search', filters.search)
  if (filters?.active !== undefined) params.append('active', filters.active ? '1' : '0')
  if (filters?.needing_alert !== undefined) params.append('needing_alert', filters.needing_alert ? '1' : '0')
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/budgets${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get single budget
 * GET /api/v2/finance/budgets/{id}
 */
export const getBudget = async (id: number) => {
  const response = await api.get(`finance/budgets/${id}`)
  return response.data
}

/**
 * Create new budget
 * POST /api/v2/finance/budgets
 */
export const createBudget = async (data: {
  name: string
  description?: string
  account_id?: number
  scope_type: 'company' | 'department' | 'account'
  scope_id?: string
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  fiscal_year: string
  period_name?: string
  start_date: string
  end_date: string
  planned_amount: number
  alert_threshold?: number
  notes?: string
}) => {
  const response = await api.post('finance/budgets', data)
  return response.data
}

/**
 * Update budget
 * PUT /api/v2/finance/budgets/{id}
 */
export const updateBudget = async (id: number, data: {
  name?: string
  description?: string
  account_id?: number
  scope_type?: 'company' | 'department' | 'account'
  scope_id?: string
  period_type?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  fiscal_year?: string
  period_name?: string
  start_date?: string
  end_date?: string
  planned_amount?: number
  alert_threshold?: number
  notes?: string
}) => {
  const response = await api.put(`finance/budgets/${id}`, data)
  return response.data
}

/**
 * Delete budget
 * DELETE /api/v2/finance/budgets/{id}
 */
export const deleteBudget = async (id: number) => {
  const response = await api.delete(`finance/budgets/${id}`)
  return response.data
}

/**
 * Approve budget
 * POST /api/v2/finance/budgets/{id}/approve
 */
export const approveBudget = async (id: number) => {
  const response = await api.post(`finance/budgets/${id}/approve`)
  return response.data
}

/**
 * Update actual amount
 * PUT /api/v2/finance/budgets/{id}/actual
 */
export const updateBudgetActual = async (id: number, data: {
  actual_amount: number
}) => {
  const response = await api.put(`finance/budgets/${id}/actual`, data)
  return response.data
}

/**
 * Get budget variance report
 * GET /api/v2/finance/budgets/variance-report
 */
export const getBudgetVarianceReport = async (filters?: {
  fiscal_year?: string
  period_type?: 'monthly' | 'quarterly' | 'yearly' | 'custom'
  scope_type?: 'company' | 'department' | 'account'
}) => {
  const params = new URLSearchParams()

  if (filters?.fiscal_year) params.append('fiscal_year', filters.fiscal_year)
  if (filters?.period_type) params.append('period_type', filters.period_type)
  if (filters?.scope_type) params.append('scope_type', filters.scope_type)

  const queryString = params.toString()
  const response = await api.get(`finance/budgets/variance-report${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get budget statistics
 * GET /api/v2/finance/budgets/statistics
 */
export const getBudgetStatistics = async (fiscalYear?: string) => {
  const params = fiscalYear ? `?fiscal_year=${fiscalYear}` : ''
  const response = await api.get(`finance/budgets/statistics${params}`)
  return response.data
}

// ============================================
// COST CENTER API METHODS
// ============================================

export type CostCenter = {
  id: number
  name: string
  code: string
  description?: string
  department_id?: number
  manager_id?: number
  monthly_budget: number
  actual_spent: number
  remaining_budget: number
  location?: string
  is_active: boolean
  notes?: string
  created_by: number
  updated_by?: number
  created_at: string
  updated_at: string
  // Computed properties
  budget_utilization?: number
  is_over_budget?: boolean
  is_approaching_limit?: boolean
  department?: {
    id: number
    name: string
  }
  manager?: {
    id: number
    name: string
  }
  creator?: {
    id: number
    name: string
  }
}

export type CostCenterFilters = {
  department_id?: number
  manager_id?: number
  is_active?: boolean
  search?: string
  active?: boolean
  page?: number
  per_page?: number
}

/**
 * Get all cost centers with filters
 * GET /api/v2/finance/cost-centers
 */
export const getCostCenters = async (filters?: CostCenterFilters) => {
  const params = new URLSearchParams()

  if (filters?.department_id) params.append('department_id', filters.department_id.toString())
  if (filters?.manager_id) params.append('manager_id', filters.manager_id.toString())
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active ? '1' : '0')
  if (filters?.search) params.append('search', filters.search)
  if (filters?.active !== undefined) params.append('active', filters.active ? '1' : '0')
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/cost-centers${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get single cost center
 * GET /api/v2/finance/cost-centers/{id}
 */
export const getCostCenter = async (id: number) => {
  const response = await api.get(`finance/cost-centers/${id}`)
  return response.data
}

/**
 * Create new cost center
 * POST /api/v2/finance/cost-centers
 */
export const createCostCenter = async (data: {
  name: string
  code?: string
  description?: string
  department_id?: number
  manager_id?: number
  monthly_budget: number
  location?: string
  is_active?: boolean
  notes?: string
}) => {
  const response = await api.post('finance/cost-centers', data)
  return response.data
}

/**
 * Update cost center
 * PUT /api/v2/finance/cost-centers/{id}
 */
export const updateCostCenter = async (id: number, data: {
  name?: string
  code?: string
  description?: string
  department_id?: number
  manager_id?: number
  monthly_budget?: number
  location?: string
  is_active?: boolean
  notes?: string
}) => {
  const response = await api.put(`finance/cost-centers/${id}`, data)
  return response.data
}

/**
 * Delete cost center
 * DELETE /api/v2/finance/cost-centers/{id}
 */
export const deleteCostCenter = async (id: number) => {
  const response = await api.delete(`finance/cost-centers/${id}`)
  return response.data
}

/**
 * Allocate budget to cost center
 * POST /api/v2/finance/cost-centers/{id}/allocate-budget
 */
export const allocateCostCenterBudget = async (id: number, data: {
  amount: number
  notes?: string
}) => {
  const response = await api.post(`finance/cost-centers/${id}/allocate-budget`, data)
  return response.data
}

/**
 * Recalculate cost center budget
 * POST /api/v2/finance/cost-centers/{id}/recalculate-budget
 */
export const recalculateCostCenterBudget = async (id: number) => {
  const response = await api.post(`finance/cost-centers/${id}/recalculate-budget`)
  return response.data
}

/**
 * Get cost center expenses
 * GET /api/v2/finance/cost-centers/{id}/expenses
 */
export const getCostCenterExpenses = async (id: number, filters?: {
  start_date?: string
  end_date?: string
  status?: string
  per_page?: number
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/cost-centers/${id}/expenses${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get cost center statistics
 * GET /api/v2/finance/cost-centers/statistics
 */
export const getCostCenterStatistics = async (departmentId?: number) => {
  const params = departmentId ? `?department_id=${departmentId}` : ''
  const response = await api.get(`finance/cost-centers/statistics${params}`)
  return response.data
}

/**
 * Get next cost center code
 * GET /api/v2/finance/cost-centers/next-code
 */
export const getNextCostCenterCode = async () => {
  const response = await api.get('finance/cost-centers/next-code')
  return response.data
}

// ============================================
// PROJECT API METHODS
// ============================================

export type Project = {
  id: number
  name: string
  code: string
  description?: string
  customer_id?: number
  start_date: string
  end_date?: string
  deadline?: string
  budget_amount: number
  estimated_revenue: number
  actual_cost: number
  actual_revenue: number
  profit: number
  profit_margin: number
  manager_id?: number
  department_id?: number
  cost_center_id?: number
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage: number
  location?: string
  notes?: string
  attachments?: any[]
  created_by: number
  updated_by?: number
  created_at: string
  updated_at: string
  // Computed properties
  budget_utilization?: number
  is_over_budget?: boolean
  days_remaining?: number
  is_overdue?: boolean
  status_label?: string
  status_badge?: string
  priority_label?: string
  priority_color?: string
  customer?: {
    id: number
    name: string
  }
  manager?: {
    id: number
    name: string
  }
  department?: {
    id: number
    name: string
  }
  costCenter?: {
    id: number
    name: string
    code: string
  }
  creator?: {
    id: number
    name: string
  }
}

export type ProjectFilters = {
  customer_id?: number
  department_id?: number
  cost_center_id?: number
  manager_id?: number
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  search?: string
  active?: boolean
  completed?: boolean
  page?: number
  per_page?: number
}

/**
 * Get all projects with filters
 * GET /api/v2/finance/projects
 */
export const getProjects = async (filters?: ProjectFilters) => {
  const params = new URLSearchParams()

  if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString())
  if (filters?.department_id) params.append('department_id', filters.department_id.toString())
  if (filters?.cost_center_id) params.append('cost_center_id', filters.cost_center_id.toString())
  if (filters?.manager_id) params.append('manager_id', filters.manager_id.toString())
  if (filters?.status) params.append('status', filters.status)
  if (filters?.priority) params.append('priority', filters.priority)
  if (filters?.search) params.append('search', filters.search)
  if (filters?.active !== undefined) params.append('active', filters.active ? '1' : '0')
  if (filters?.completed !== undefined) params.append('completed', filters.completed ? '1' : '0')
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/projects${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get single project
 * GET /api/v2/finance/projects/{id}
 */
export const getProject = async (id: number) => {
  const response = await api.get(`finance/projects/${id}`)
  return response.data
}

/**
 * Create new project
 * POST /api/v2/finance/projects
 */
export const createProject = async (data: {
  name: string
  code?: string
  description?: string
  customer_id?: number
  start_date: string
  end_date?: string
  deadline?: string
  budget_amount: number
  estimated_revenue: number
  manager_id?: number
  department_id?: number
  cost_center_id?: number
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage?: number
  location?: string
  notes?: string
}) => {
  const response = await api.post('finance/projects', data)
  return response.data
}

/**
 * Update project
 * PUT /api/v2/finance/projects/{id}
 */
export const updateProject = async (id: number, data: {
  name?: string
  code?: string
  description?: string
  customer_id?: number
  start_date?: string
  end_date?: string
  deadline?: string
  budget_amount?: number
  estimated_revenue?: number
  actual_revenue?: number
  manager_id?: number
  department_id?: number
  cost_center_id?: number
  status?: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  progress_percentage?: number
  location?: string
  notes?: string
}) => {
  const response = await api.put(`finance/projects/${id}`, data)
  return response.data
}

/**
 * Delete project
 * DELETE /api/v2/finance/projects/{id}
 */
export const deleteProject = async (id: number) => {
  const response = await api.delete(`finance/projects/${id}`)
  return response.data
}

/**
 * Calculate project profitability
 * POST /api/v2/finance/projects/{id}/calculate-profitability
 */
export const calculateProjectProfitability = async (id: number) => {
  const response = await api.post(`finance/projects/${id}/calculate-profitability`)
  return response.data
}

/**
 * Update project progress
 * PUT /api/v2/finance/projects/{id}/update-progress
 */
export const updateProjectProgress = async (id: number, data: {
  progress_percentage: number
}) => {
  const response = await api.put(`finance/projects/${id}/update-progress`, data)
  return response.data
}

/**
 * Get project expenses
 * GET /api/v2/finance/projects/{id}/expenses
 */
export const getProjectExpenses = async (id: number, filters?: {
  start_date?: string
  end_date?: string
  status?: string
  per_page?: number
}) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/projects/${id}/expenses${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get project statistics
 * GET /api/v2/finance/projects/statistics
 */
export const getProjectStatistics = async (filters?: {
  department_id?: number
  cost_center_id?: number
}) => {
  const params = new URLSearchParams()

  if (filters?.department_id) params.append('department_id', filters.department_id.toString())
  if (filters?.cost_center_id) params.append('cost_center_id', filters.cost_center_id.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/projects/statistics${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get next project code
 * GET /api/v2/finance/projects/next-code
 */
export const getNextProjectCode = async () => {
  const response = await api.get('finance/projects/next-code')
  return response.data
}

// ============================================
// FISCAL YEAR API METHODS
// ============================================

export type FiscalYear = {
  id: number
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  is_closed: boolean
  notes?: string
  created_by: number
  closed_by?: number
  closed_at?: string
  created_at: string
  updated_at: string
  // Computed properties
  creator?: {
    id: number
    name: string
  }
  closer?: {
    id: number
    name: string
  }
}

export type FiscalYearFilters = {
  is_active?: boolean
  is_closed?: boolean
  search?: string
  page?: number
  per_page?: number
}

/**
 * Get all fiscal years with filters
 * GET /api/v2/finance/fiscal-years
 */
export const getFiscalYears = async (filters?: FiscalYearFilters) => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active ? '1' : '0')
  if (filters?.is_closed !== undefined) params.append('is_closed', filters.is_closed ? '1' : '0')
  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const queryString = params.toString()
  const response = await api.get(`finance/fiscal-years${queryString ? `?${queryString}` : ''}`)
  return response.data
}

/**
 * Get single fiscal year
 * GET /api/v2/finance/fiscal-years/{id}
 */
export const getFiscalYear = async (id: number) => {
  const response = await api.get(`finance/fiscal-years/${id}`)
  return response.data
}

/**
 * Create new fiscal year
 * POST /api/v2/finance/fiscal-years
 */
export const createFiscalYear = async (data: {
  name: string
  start_date: string
  end_date: string
  is_active?: boolean
  notes?: string
}) => {
  const response = await api.post('finance/fiscal-years', data)
  return response.data
}

/**
 * Update fiscal year
 * PUT /api/v2/finance/fiscal-years/{id}
 */
export const updateFiscalYear = async (id: number, data: {
  name?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
  notes?: string
}) => {
  const response = await api.put(`finance/fiscal-years/${id}`, data)
  return response.data
}

/**
 * Delete fiscal year
 * DELETE /api/v2/finance/fiscal-years/{id}
 */
export const deleteFiscalYear = async (id: number) => {
  const response = await api.delete(`finance/fiscal-years/${id}`)
  return response.data
}

/**
 * Close fiscal year
 * POST /api/v2/finance/fiscal-years/{id}/close
 */
export const closeFiscalYear = async (id: number) => {
  const response = await api.post(`finance/fiscal-years/${id}/close`)
  return response.data
}

/**
 * Reopen fiscal year
 * POST /api/v2/finance/fiscal-years/{id}/reopen
 */
export const reopenFiscalYear = async (id: number) => {
  const response = await api.post(`finance/fiscal-years/${id}/reopen`)
  return response.data
}

/**
 * Get fiscal year summary with financial data
 * GET /api/v2/finance/fiscal-years/{id}/summary
 */
export const getFiscalYearSummary = async (id: number) => {
  const response = await api.get(`finance/fiscal-years/${id}/summary`)
  return response.data
}

/**
 * Get current active fiscal year
 * GET /api/v2/finance/fiscal-years/current
 */
export const getCurrentFiscalYear = async () => {
  const response = await api.get('finance/fiscal-years/current')
  return response.data
}

/**
 * Get fiscal year statistics
 * GET /api/v2/finance/fiscal-years/statistics
 */
export const getFiscalYearStatistics = async () => {
  const response = await api.get('finance/fiscal-years/statistics')
  return response.data
}

/**
 * Check if date is in closed period
 * GET /api/v2/finance/fiscal-years/check-date
 */
export const checkFiscalYearDate = async (date: string) => {
  const response = await api.get(`finance/fiscal-years/check-date?date=${date}`)
  return response.data
}

// ============================================
// USERS API METHODS
// ============================================

export type User = {
  id: number
  name: string
  email: string
  phone?: string | null
}

/**
 * Get all users
 * GET /api/v2/user-management/users?user_type=staff
 */
export const getUsers = async () => {
  const response = await api.get('user-management/users?type=staff')
  return response.data
}

// ============================================
// SUPPLIERS API METHODS
// ============================================

export type Supplier = {
  id: number
  name: string
  email: string
  whatsapp?: string | null
  shopUrl?: string | null
  shopName?: string | null
  contactPerson?: string | null
  phone?: string | null
  wechatId?: string | null
  wechatQrFile?: string | null
  wechatQrUrl?: string | null
  alipayId?: string | null
  alipayQrFile?: string | null
  alipayQrUrl?: string | null
  address?: string | null
  isActive: boolean
  walletBalance?: number | null
  creditLimit?: number | null
  walletNotes?: string | null
  createdAt: string
  updatedAt: string
}

export type SupplierFilters = {
  search?: string
  is_active?: boolean | null
  page?: number
  per_page?: number
}

/**
 * Get all suppliers with optional filters
 * GET /api/v2/user-management/suppliers
 */
export const getSuppliers = async (filters?: SupplierFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.is_active !== undefined && filters.is_active !== null) {
    params.append('is_active', filters.is_active ? '1' : '0')
  }
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await api.get(`user-management/suppliers?${params}`)
  return response.data
}

/**
 * Get single supplier by ID
 * GET /api/v2/user-management/suppliers/{id}
 */
export const getSupplier = async (id: number) => {
  const response = await api.get(`user-management/suppliers/${id}`)
  return response.data
}

/**
 * Create new supplier
 * POST /api/v2/user-management/suppliers
 */
export const createSupplier = async (data: {
  name: string
  email: string
  whatsapp?: string
  shop_url?: string
  shop_name?: string
  contact_person?: string
  phone?: string
  wechat_id?: string
  wechat_qr_file?: string
  wechat_qr_url?: string
  alipay_id?: string
  alipay_qr_file?: string
  alipay_qr_url?: string
  address?: string
  is_active?: boolean
} | FormData) => {
  const response = await api.post('user-management/suppliers', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return response.data
}

/**
 * Update supplier
 * PUT/PATCH /api/v2/user-management/suppliers/{id}
 */
export const updateSupplier = async (id: number, data: {
  name?: string
  email?: string
  whatsapp?: string
  shop_url?: string
  shop_name?: string
  contact_person?: string
  phone?: string
  wechat_id?: string
  wechat_qr_file?: string
  wechat_qr_url?: string
  alipay_id?: string
  alipay_qr_file?: string
  alipay_qr_url?: string
  address?: string
  is_active?: boolean
} | FormData) => {
  const response = await api.put(`user-management/suppliers/${id}`, data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  })
  return response.data
}

/**
 * Delete supplier
 * DELETE /api/v2/user-management/suppliers/{id}
 */
export const deleteSupplier = async (id: number) => {
  const response = await api.delete(`user-management/suppliers/${id}`)
  return response.data
}

// ============================================
// BRANDS API METHODS
// ============================================

export type Brand = {
  id: number
  name: string
  slug: string
  logoId?: number | null
  website?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type BrandFilters = {
  search?: string
  page?: number
  per_page?: number
}

/**
 * Get all brands with optional filters
 * GET /api/v2/catalog/brands
 */
export const getBrands = async (filters?: BrandFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await api.get(`catalog/brands?${params}`)
  return response.data
}

/**
 * Get single brand by ID
 * GET /api/v2/catalog/brands/{id}
 */
export const getBrand = async (id: number) => {
  const response = await api.get(`catalog/brands/${id}`)
  return response.data
}

/**
 * Get brands for dropdown (ID & Name only)
 * GET /api/v2/catalog/brands/dropdown
 */
export const getBrandsDropdown = async () => {
  const response = await api.get('catalog/brands/dropdown')
  return response.data
}

/**
 * Create new brand
 * POST /api/v2/catalog/brands
 */
export const createBrand = async (data: {
  name: string
  logoId?: number
  website?: string
}) => {
  const response = await api.post('catalog/brands', {
    name: data.name,
    logo_id: data.logoId,
    website: data.website,
  })
  return response.data
}

/**
 * Update brand
 * PUT/PATCH /api/v2/catalog/brands/{id}
 */
export const updateBrand = async (id: number, data: {
  name?: string
  logoId?: number
  website?: string
}) => {
  const response = await api.put(`catalog/brands/${id}`, {
    name: data.name,
    logo_id: data.logoId,
    website: data.website,
  })
  return response.data
}

/**
 * Delete brand
 * DELETE /api/v2/catalog/brands/{id}
 */
export const deleteBrand = async (id: number) => {
  const response = await api.delete(`catalog/brands/${id}`)
  return response.data
}

// ============================================
// CATEGORIES API METHODS
// ============================================

export type Category = {
  id: number
  name: string
  slug: string
  parent_id?: number | null
  image_id?: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  parent?: Category
  children?: Category[]
  image?: { id: number; url: string; file_name: string; file_path: string } | null
  productsCount?: number
}

export type CategoryFilters = {
  search?: string
  page?: number
  per_page?: number
}

/**
 * Get all categories with optional filters
 * GET /api/v2/catalog/categories
 */
export const getCategories = async (filters?: CategoryFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await api.get(`catalog/categories?${params}`)
  return response.data
}

/**
 * Get single category by ID
 * GET /api/v2/catalog/categories/{id}
 */
export const getCategory = async (id: number) => {
  const response = await api.get(`catalog/categories/${id}`)
  return response.data
}

/**
 * Get category tree structure for dropdowns/menus
 * GET /api/v2/catalog/helpers/categories/tree
 */
export const getCategoryTree = async () => {
  const response = await api.get('catalog/helpers/categories/tree')
  return response.data
}

/**
 * Create new category
 * POST /api/v2/catalog/categories
 */
export const createCategory = async (data: {
  name: string
  parent_id?: number | null
  image_id?: number | null
}) => {
  const response = await api.post('catalog/categories', {
    name: data.name,
    parent_id: data.parent_id,
    image_id: data.image_id,
  })
  return response.data
}

/**
 * Update category
 * PUT/PATCH /api/v2/catalog/categories/{id}
 */
export const updateCategory = async (id: number, data: {
  name?: string
  parent_id?: number | null
  image_id?: number | null
  is_active?: boolean
}) => {
  const response = await api.put(`catalog/categories/${id}`, {
    name: data.name,
    parent_id: data.parent_id,
    image_id: data.image_id,
    is_active: data.is_active,
  })
  return response.data
}

/**
 * Delete category
 * DELETE /api/v2/catalog/categories/{id}
 */
export const deleteCategory = async (id: number) => {
  const response = await api.delete(`catalog/categories/${id}`)
  return response.data
}

// ============================================
// UNITS API METHODS
// ============================================

export type Unit = {
  id: number
  name: string
  symbol: string
  allowDecimal: boolean
  createdAt: string
  updatedAt: string
}

export type UnitFilters = {
  search?: string
}

/**
 * Get all units
 * GET /api/v2/system/units
 */
export const getUnits = async (filters?: UnitFilters) => {
  const response = await api.get('system/units')
  return response.data
}

/**
 * Get units for dropdown (lightweight)
 * GET /api/v2/system/helpers/units
 */
export const getUnitsDropdown = async () => {
  const response = await api.get('system/helpers/units')
  return response.data
}

/**
 * Get single unit by ID
 * GET /api/v2/system/units/{id}
 */
export const getUnit = async (id: number) => {
  const response = await api.get(`system/units/${id}`)
  return response.data
}

/**
 * Create new unit
 * POST /api/v2/system/units
 */
export const createUnit = async (data: {
  name: string
  symbol: string
  allow_decimal?: boolean
}) => {
  const response = await api.post('system/units', data)
  return response.data
}

/**
 * Update unit
 * PUT/PATCH /api/v2/system/units/{id}
 */
export const updateUnit = async (id: number, data: {
  name?: string
  symbol?: string
  allow_decimal?: boolean
}) => {
  const response = await api.put(`system/units/${id}`, data)
  return response.data
}

/**
 * Delete unit
 * DELETE /api/v2/system/units/{id}
 */
export const deleteUnit = async (id: number) => {
  const response = await api.delete(`system/units/${id}`)
  return response.data
}

// ============================================
// ATTRIBUTES API METHODS
// ============================================

export type AttributeOption = {
  id: number
  attributeId: number
  value: string
  label?: string | null
  swatchValue?: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type Attribute = {
  id: number
  name: string
  displayName: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'color' | 'date' | 'boolean'
  isRequired: boolean
  isVisible: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  options?: AttributeOption[]
}

export type AttributeFilters = {
  search?: string
}

/**
 * Get all attributes with options
 * GET /api/v2/catalog/attributes
 */
export const getAttributes = async (filters?: AttributeFilters) => {
  const response = await api.get('catalog/attributes')
  return response.data
}

/**
 * Get single attribute by ID
 * GET /api/v2/catalog/attributes/{id}
 */
export const getAttribute = async (id: number) => {
  const response = await api.get(`catalog/attributes/${id}`)
  return response.data
}

/**
 * Create new attribute
 * POST /api/v2/catalog/attributes
 */
export const createAttribute = async (data: {
  name: string
  displayName: string
  type: 'text' | 'number' | 'select' | 'multiselect' | 'color' | 'date' | 'boolean'
  isRequired?: boolean
  isVisible?: boolean
  sortOrder?: number
  options?: Array<{
    value: string
    label?: string
    swatchValue?: string
    sortOrder?: number
  }>
}) => {
  const response = await api.post('catalog/attributes', data)
  return response.data
}

/**
 * Update attribute
 * PUT/PATCH /api/v2/catalog/attributes/{id}
 */
export const updateAttribute = async (id: number, data: {
  name?: string
  displayName?: string
  type?: 'text' | 'number' | 'select' | 'multiselect' | 'color' | 'date' | 'boolean'
  isRequired?: boolean
  isVisible?: boolean
  sortOrder?: number
  options?: Array<{
    id?: number
    value: string
    label?: string
    swatchValue?: string
    sortOrder?: number
  }>
}) => {
  const response = await api.put(`catalog/attributes/${id}`, data)
  return response.data
}

/**
 * Delete attribute
 * DELETE /api/v2/catalog/attributes/{id}
 */
export const deleteAttribute = async (id: number) => {
  const response = await api.delete(`catalog/attributes/${id}`)
  return response.data
}

// ============================================
// MEDIA LIBRARY API METHODS
// ============================================

export type MediaFolder = {
  id: number
  name: string
  slug: string
  parentId?: number | null
  mediaFilesCount?: number
  viewRoles?: string[] | null
  editRoles?: string[] | null
  createdAt: string
  updatedAt: string
}

export type MediaFile = {
  id: number
  folderId?: number | null
  filename: string
  originalFilename: string
  path: string
  url: string
  mimeType: string
  size: number
  disk: string
  width?: number | null
  height?: number | null
  uploadedByUserId?: number | null
  createdAt: string
  updatedAt: string
}

export type MediaFilters = {
  folderId?: number
  type?: string
  page?: number
  per_page?: number
}

/**
 * Get all folders
 * GET /api/v2/media/folders
 */
export const getMediaFolders = async () => {
  const response = await api.get('media/folders')
  return response.data
}

/**
 * Create new folder
 * POST /api/v2/media/folders
 */
export const createMediaFolder = async (data: {
  name: string
  parentId?: number
  viewRoles?: string[]
  editRoles?: string[]
}) => {
  const response = await api.post('media/folders', {
    name: data.name,
    parent_id: data.parentId,
    view_roles: data.viewRoles || [],
    edit_roles: data.editRoles || [],
  })
  return response.data
}

/**
 * Get files with filters
 * GET /api/v2/media/files
 */
export const getMediaFiles = async (filters?: MediaFilters) => {
  const params = new URLSearchParams()
  if (filters?.folderId) params.append('folder_id', filters.folderId.toString())
  if (filters?.type) params.append('type', filters.type)
  if (filters?.page) params.append('page', filters.page.toString())
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())

  const response = await api.get(`media/files?${params}`)
  return response.data
}

/**
 * Upload files
 * POST /api/v2/media/upload
 */
export const uploadMediaFiles = async (files: FileList | File[], folderId?: number) => {
  const formData = new FormData()
  files = Array.from(files)

  files.forEach((file) => {
    formData.append('files[]', file)
  })

  if (folderId) {
    formData.append('folder_id', folderId.toString())
  }

  const response = await api.post('media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

/**
 * Bulk delete files
 * DELETE /api/v2/media/files/bulk-delete
 */
export const bulkDeleteMediaFiles = async (ids: number[]) => {
  const response = await api.delete('media/files/bulk-delete', { data: { ids } })
  return response.data
}

/**
 * Bulk move files to folder
 * POST /api/v2/media/files/bulk-move
 */
export const bulkMoveMediaFiles = async (ids: number[], folderId: number | null) => {
  const response = await api.post('media/files/bulk-move', {
    ids,
    folder_id: folderId,
  })
  return response.data
}

/**
 * Delete folder
 * DELETE /api/v2/media/folders/{id}
 */
export const deleteMediaFolder = async (id: number) => {
  const response = await api.delete(`media/folders/${id}`)
  return response.data
}

/**
 * Update/Rename folder
 * PUT/PATCH /api/v2/media/folders/{id}
 */
export const updateMediaFolder = async (id: number, data: {
  name: string
  viewRoles?: string[]
  editRoles?: string[]
}) => {
  const response = await api.put(`media/folders/${id}`, {
    name: data.name,
    view_roles: data.viewRoles,
    edit_roles: data.editRoles,
  })
  return response.data
}

/**
 * Get single media file
 * GET /api/v2/media/files/{id}
 */
export const getMediaFile = async (id: number) => {
  const response = await api.get(`media/files/${id}`)
  return response.data
}

/**
 * Update media file (move, rename, alt text)
 * PUT /api/v2/media/files/{id}
 */
export const updateMediaFile = async (id: number, data: {
  folder_id?: number | null
  alt_text?: string
  filename?: string
}) => {
  const response = await api.put(`media/files/${id}`, data)
  return response.data
}

// ============================================
// CURRENCIES API METHODS
// ============================================

export type Currency = {
  id: number
  code: string
  name: string
  symbol: string
  symbolPosition: 'left' | 'right'
  decimalPlaces: number
  isDefault: boolean
  exchangeRate: number | null
  isActive: boolean
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export type CurrencyFilters = {
  is_active?: boolean
}

/**
 * Get all currencies
 * GET /api/v2/finance/currencies
 */
export const getCurrencies = async (filters?: CurrencyFilters) => {
  const params = new URLSearchParams()

  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active ? '1' : '0')

  const response = await api.get(`finance/currencies?${params}`)
  return response.data
}

/**
 * Get single currency by ID
 * GET /api/v2/finance/currencies/{id}
 */
export const getCurrency = async (id: number) => {
  const response = await api.get(`finance/currencies/${id}`)
  return response.data
}

/**
 * Get default currency
 * GET /api/v2/finance/currencies/default
 */
export const getDefaultCurrency = async () => {
  const response = await api.get('finance/currencies/default')
  return response.data
}

/**
 * Create new currency
 * POST /api/v2/finance/currencies
 */
export const createCurrency = async (data: {
  code: string
  name: string
  symbol: string
  symbol_position: 'left' | 'right'
  decimal_places: number
  exchange_rate?: number | null
  is_active?: boolean
  notes?: string | null
}) => {
  const response = await api.post('finance/currencies', data)
  return response.data
}

/**
 * Update currency
 * PUT/PATCH /api/v2/finance/currencies/{id}
 */
export const updateCurrency = async (id: number, data: {
  name?: string
  symbol?: string
  symbol_position?: 'left' | 'right'
  decimal_places?: number
  exchange_rate?: number | null
  is_active?: boolean
  is_default?: boolean
  notes?: string | null
}) => {
  const response = await api.put(`finance/currencies/${id}`, data)
  return response.data
}

/**
 * Delete currency
 * DELETE /api/v2/finance/currencies/{id}
 */
export const deleteCurrency = async (id: number) => {
  const response = await api.delete(`finance/currencies/${id}`)
  return response.data
}

/**
 * Convert amount between currencies
 * POST /api/v2/finance/currencies/convert
 */
export const convertCurrency = async (data: {
  amount: number
  from_currency: string
  to_currency?: string | null
  format?: boolean
}) => {
  const response = await api.post('finance/currencies/convert', data)
  return response.data
}

/**
 * Update exchange rate
 * POST /api/v2/finance/currencies/{id}/exchange-rate
 */
export const updateCurrencyExchangeRate = async (id: number, exchangeRate: number) => {
  const response = await api.post(`finance/currencies/${id}/exchange-rate`, {
    exchange_rate: exchangeRate,
  })
  return response.data
}

// ============================================
// ADVANCED FINANCIAL REPORTS API METHODS
// ============================================

export type FinancialReport = {
  id: number
  name: string
  type: 'comparative' | 'ratio' | 'cash_flow' | 'fund_flow' | 'custom'
  description?: string | null
  templateId?: number | null
  startDate: string
  endDate: string
  compareStartDate?: string | null
  compareEndDate?: string | null
  periodType?: string | null
  config?: Record<string, any>
  columns?: string[]
  filters?: Record<string, any>
  isScheduled: boolean
  scheduleFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  nextRunAt?: string | null
  exportFormat: 'pdf' | 'excel' | 'csv'
  status: 'pending' | 'generating' | 'completed' | 'failed'
  data?: Record<string, any>
  summary?: Record<string, any>
  errorMessage?: string | null
  createdAt: string
  updatedAt: string
}

export type ReportTemplate = {
  id: number
  name: string
  type: string
  category: string
  description?: string | null
  config: Record<string, any>
  isSystem: boolean
  isActive: boolean
}

export type FinancialReportFilters = {
  type?: string
  status?: string
  scheduled?: boolean
}

/**
 * Get all financial reports
 * GET /api/v2/finance/reports
 */
export const getFinancialReports = async (filters?: FinancialReportFilters) => {
  const params = new URLSearchParams()

  if (filters?.type) params.append('type', filters.type)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.scheduled !== undefined) params.append('scheduled', filters.scheduled ? '1' : '0')

  const response = await api.get(`finance/reports?${params}`)
  return response.data
}

/**
 * Get single financial report
 * GET /api/v2/finance/reports/{id}
 */
export const getFinancialReport = async (id: number) => {
  const response = await api.get(`finance/reports/${id}`)
  return response.data
}

/**
 * Create financial report
 * POST /api/v2/finance/reports
 */
export const createFinancialReport = async (data: {
  name: string
  type: 'comparative' | 'ratio' | 'cash_flow' | 'fund_flow' | 'custom'
  description?: string | null
  template_id?: number | null
  start_date: string
  end_date: string
  compare_start_date?: string | null
  compare_end_date?: string | null
  period_type?: string | null
  config?: Record<string, any>
  columns?: string[]
  filters?: Record<string, any>
  is_scheduled?: boolean
  schedule_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  export_format?: 'pdf' | 'excel' | 'csv'
}) => {
  const response = await api.post('finance/reports', data)
  return response.data
}

/**
 * Update financial report
 * PUT /api/v2/finance/reports/{id}
 */
export const updateFinancialReport = async (id: number, data: {
  name?: string
  description?: string | null
  start_date?: string
  end_date?: string
  compare_start_date?: string | null
  compare_end_date?: string | null
  period_type?: string | null
  config?: Record<string, any>
  columns?: string[]
  filters?: Record<string, any>
  is_scheduled?: boolean
  schedule_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  export_format?: 'pdf' | 'excel' | 'csv'
}) => {
  const response = await api.put(`finance/reports/${id}`, data)
  return response.data
}

/**
 * Delete financial report
 * DELETE /api/v2/finance/reports/{id}
 */
export const deleteFinancialReport = async (id: number) => {
  const response = await api.delete(`finance/reports/${id}`)
  return response.data
}

/**
 * Generate financial report
 * POST /api/v2/finance/reports/{id}/generate
 */
export const generateFinancialReport = async (id: number) => {
  const response = await api.post(`finance/reports/${id}/generate`)
  return response.data
}

/**
 * Export financial report
 * GET /api/v2/finance/reports/{id}/export
 */
export const exportFinancialReport = async (id: number) => {
  const response = await api.get(`finance/reports/${id}/export`)
  return response.data
}

/**
 * Get report templates
 * GET /api/v2/finance/reports/templates
 */
export const getReportTemplates = async (filters?: { type?: string; category?: string }) => {
  const params = new URLSearchParams()

  if (filters?.type) params.append('type', filters.type)
  if (filters?.category) params.append('category', filters.category)

  const response = await api.get(`finance/reports/templates?${params}`)
  return response.data
}

/**
 * Get financial report statistics
 * GET /api/v2/finance/reports/statistics
 */
export const getFinancialReportStatistics = async () => {
  const response = await api.get('finance/reports/statistics')
  return response.data
}

// ============================================
// FINANCE AUDIT TRAIL API METHODS
// ============================================

export type AuditLog = {
  id: number
  entityType: string
  entityId: number
  action: string
  description: string
  oldValues?: Record<string, any> | null
  newValues?: Record<string, any> | null
  ipAddress?: string | null
  userAgent?: string | null
  performedBy: number
  createdAt: string
}

export type AuditFilters = {
  entity_type?: string
  entity_id?: number
  action?: string
  user_id?: number
  start_date?: string
  end_date?: string
  search?: string
}

/**
 * Get audit logs
 * GET /api/v2/finance/audit
 */
export const getAuditLogs = async (filters?: AuditFilters) => {
  const params = new URLSearchParams()

  if (filters?.entity_type) params.append('entity_type', filters.entity_type)
  if (filters?.entity_id) params.append('entity_id', filters.entity_id.toString())
  if (filters?.action) params.append('action', filters.action)
  if (filters?.user_id) params.append('user_id', filters.user_id.toString())
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.search) params.append('search', filters.search)

  const response = await api.get(`finance/audit?${params}`)
  return response.data
}

/**
 * Get single audit log
 * GET /api/v2/finance/audit/{id}
 */
export const getAuditLog = async (id: number) => {
  const response = await api.get(`finance/audit/${id}`)
  return response.data
}

/**
 * Get audit statistics
 * GET /api/v2/finance/audit/statistics
 */
export const getAuditStatistics = async (filters?: { start_date?: string; end_date?: string }) => {
  const params = new URLSearchParams()

  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)

  const response = await api.get(`finance/audit/statistics?${params}`)
  return response.data
}

/**
 * Get entity history
 * GET /api/v2/finance/audit/history
 */
export const getEntityHistory = async (entityType: string, entityId: number) => {
  const response = await api.get(`finance/audit/history?entity_type=${entityType}&entity_id=${entityId}`)
  return response.data
}

/**
 * Get entity timeline
 * GET /api/v2/finance/audit/timeline
 */
export const getEntityTimeline = async (entityType: string, entityId: number) => {
  const response = await api.get(`finance/audit/timeline?entity_type=${entityType}&entity_id=${entityId}`)
  return response.data
}

// ============================================
// PRODUCTS API METHODS
// ============================================

export type Product = {
  id: number
  name: string
  slug: string
  categoryId: number
  brandId?: number | null
  thumbnailId?: number | null
  galleryImages?: number[] | null // Internal IDs
  galleryImagesUrls?: string[] | null // Public URLs for display
  description?: string | null
  status: 'draft' | 'published' | 'archived'
  videoUrl?: string | null
  sortOrder?: number
  createdAt: string
  updatedAt: string
  category?: {
    id: number
    name: string
  }
  brand?: {
    id: number
    name: string
  }
  thumbnail?: {
    id: number
    fileName: string
    fullUrl: string
  }
  variants?: ProductVariant[]
}

export type ProductVariant = {
  id: number
  productId: number
  sku: string
  customSku?: string | null
  variantName?: string | null
  size?: string | null
  color?: string | null
  unitId: number
  defaultRetailPrice: number
  defaultWholesalePrice?: number | null
  defaultPurchaseCost: number
  stockAlertLevel: number
  currentStock?: number
  fullName?: string
  channelSettings?: ProductChannelSetting[]
}

export type ProductChannelSetting = {
  id: number
  productVariantId: number
  channel: 'retail_web' | 'wholesale_web' | 'daraz' | 'pos'
  price: number
  isActive: boolean
}

export type ProductSortBy =
  | 'created_at_desc'
  | 'created_at_asc'
  | 'updated_at_desc'
  | 'updated_at_asc'
  | 'price_desc'
  | 'price_asc'

export type ProductFilters = {
  search?: string
  category_id?: number
  brand_id?: number
  status?: 'draft' | 'published' | 'archived'
  sort_by?: ProductSortBy
  per_page?: number
  page?: number
}

/**
 * Get products with optional filters
 * GET /api/v2/catalog/products
 */
export const getProducts = async (filters?: ProductFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.category_id) params.append('category_id', filters.category_id.toString())
  if (filters?.brand_id) params.append('brand_id', filters.brand_id.toString())
  if (filters?.status) params.append('status', filters.status)
  if (filters?.sort_by) params.append('sort_by', filters.sort_by)
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())
  if (filters?.page) params.append('page', filters.page.toString())

  const response = await api.get(`catalog/products?${params}`)
  return response.data
}

/**
 * Get single product by ID
 * GET /api/v2/catalog/products/{id}
 */
export const getProduct = async (id: number) => {
  const response = await api.get(`catalog/products/${id}`)
  return response.data
}

/**
 * Create new product
 * POST /api/v2/catalog/products
 */
export const createProduct = async (data: {
  name: string
  categoryId: number
  brandId?: number
  thumbnailId?: number
  galleryImages?: number[]
  description?: string
  status?: 'draft' | 'published' | 'archived'
  videoUrl?: string
}) => {
  const response = await api.post('catalog/products', {
    name: data.name,
    category_id: data.categoryId,
    brand_id: data.brandId,
    thumbnail_id: data.thumbnailId,
    gallery_images: data.galleryImages,
    description: data.description,
    status: data.status || 'draft',
    video_url: data.videoUrl,
  })
  return response.data
}

/**
 * Update product
 * PUT/PATCH /api/v2/catalog/products/{id}
 */
export const updateProduct = async (id: number, data: {
  name?: string
  categoryId?: number
  brandId?: number
  thumbnailId?: number
  galleryImages?: number[]
  description?: string
  status?: 'draft' | 'published' | 'archived'
  videoUrl?: string
  crossSale?: string
  upSale?: string
  thankYou?: boolean
}) => {
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.categoryId !== undefined) payload.category_id = data.categoryId
  if (data.brandId !== undefined) payload.brand_id = data.brandId
  if (data.thumbnailId !== undefined) payload.thumbnail_id = data.thumbnailId
  if (data.galleryImages !== undefined) payload.gallery_images = data.galleryImages
  if (data.description !== undefined) payload.description = data.description
  if (data.status !== undefined) payload.status = data.status
  if (data.videoUrl !== undefined) payload.video_url = data.videoUrl
  if (data.crossSale !== undefined) payload.crossSale = data.crossSale
  if (data.upSale !== undefined) payload.upSale = data.upSale
  if (data.thankYou !== undefined) payload.thankYou = data.thankYou

  const response = await api.put(`catalog/products/${id}`, payload)
  return response.data
}

/**
 * Delete product (soft delete)
 * DELETE /api/v2/catalog/products/{id}
 */
export const deleteProduct = async (id: number) => {
  const response = await api.delete(`catalog/products/${id}`)
  return response.data
}

/**
 * Duplicate product
 * POST /api/v2/catalog/products/{id}/duplicate
 */
export const duplicateProduct = async (id: number) => {
  const response = await api.post(`catalog/products/${id}/duplicate`)
  return response.data
}

/**
 * Reorder products (drag and drop sorting)
 * POST /api/v2/catalog/products/reorder
 */
export const reorderProducts = async (products: Array<{ id: number; sort_order: number }>) => {
  const response = await api.post('catalog/products/reorder', { products })
  return response.data
}

/**
 * Generate unique SKU
 * POST /api/v2/catalog/products/generate-sku
 */
export const generateSku = async (categoryName: string) => {
  const response = await api.post('catalog/products/generate-sku', {
    category_name: categoryName,
  })
  return response.data
}

/**
 * Add variant to product
 * POST /api/v2/catalog/products/{id}/variants
 */
export const createProductVariant = async (productId: number, data: {
  sku: string
  customSku?: string
  variantName?: string
  size?: string
  color?: string
  unitId: number
  price: number
  cost?: number
  alertQty?: number
}) => {
  const response = await api.post(`catalog/products/${productId}/variants`, {
    sku: data.sku,
    custom_sku: data.customSku,
    variant_name: data.variantName,
    size: data.size,
    color: data.color,
    unit_id: data.unitId,
    price: data.price,
    cost: data.cost,
    alert_qty: data.alertQty,
  })
  return response.data
}

/**
 * Update variant
 * PUT/PATCH /api/v2/catalog/variants/{id}
 */
export const updateProductVariant = async (id: number, data: {
  sku?: string
  customSku?: string
  variantName?: string
  size?: string
  color?: string
  unitId?: number
  defaultRetailPrice?: number
  defaultWholesalePrice?: number
  defaultPurchaseCost?: number
  stockAlertLevel?: number
}) => {
  const response = await api.put(`catalog/variants/${id}`, data)
  return response.data
}

/**
 * Delete variant
 * DELETE /api/v2/catalog/variants/{id}
 */
export const deleteProductVariant = async (id: number) => {
  const response = await api.delete(`catalog/variants/${id}`)
  return response.data
}

/**
 * Get categories for dropdown
 * GET /api/v2/catalog/categories/dropdown
 */
export const getCategoriesDropdown = async () => {
  const response = await api.get('catalog/categories/dropdown')
  return response.data
}

/**
 * Update product status
 * PATCH /api/v2/catalog/products/{id}/status
 */
export const updateProductStatus = async (id: number, status: 'draft' | 'published' | 'archived') => {
  const response = await api.patch(`catalog/products/${id}/status`, { status })
  return response.data
}

// ====================================================
// PROCUREMENT PRODUCTS API
// ====================================================

export interface ProcurementProductFilters {
  search?: string
  category_id?: number
  brand_id?: number
  status?: 'draft' | 'published'
  per_page?: number
  page?: number
}

export interface ProcurementProductSupplier {
  supplierId: number
  productLinks?: string[]
}

/**
 * Get procurement products with optional filters
 * GET /api/v2/procurement/products
 */
export const getProcurementProducts = async (filters?: ProcurementProductFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.category_id) params.append('category_id', filters.category_id.toString())
  if (filters?.brand_id) params.append('brand_id', filters.brand_id.toString())
  if (filters?.status) params.append('status', filters.status)
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())
  if (filters?.page) params.append('page', filters.page.toString())

  const response = await api.get(`procurement/products?${params}`)
  return response.data
}

/**
 * Get single procurement product by ID
 * GET /api/v2/procurement/products/{id}
 */
export const getProcurementProduct = async (id: number) => {
  const response = await api.get(`procurement/products/${id}`)
  return response.data
}

/**
 * Create new procurement product
 * POST /api/v2/procurement/products
 */
export const createProcurementProduct = async (data: {
  name: string
  categoryId: number
  brandId?: number
  thumbnailId?: number
  suppliers: ProcurementProductSupplier[]
  status?: 'draft' | 'published'
}) => {
  const response = await api.post('procurement/products', {
    name: data.name,
    category_id: data.categoryId,
    brand_id: data.brandId,
    thumbnail_id: data.thumbnailId,
    suppliers: data.suppliers.map(s => ({
      supplier_id: s.supplierId,
      product_links: s.productLinks || [],
      cost_price: s.costPrice,
      supplier_sku: s.supplierSku,
    })),
    status: data.status || 'draft',
  })
  return response.data
}

/**
 * Update procurement product
 * PUT/PATCH /api/v2/procurement/products/{id}
 */
export const updateProcurementProduct = async (id: number, data: {
  name?: string
  categoryId?: number
  brandId?: number
  thumbnailId?: number
  suppliers?: ProcurementProductSupplier[]
  status?: 'draft' | 'published'
}) => {
  const response = await api.put(`procurement/products/${id}`, {
    name: data.name,
    category_id: data.categoryId,
    brand_id: data.brandId,
    thumbnail_id: data.thumbnailId,
    suppliers: data.suppliers?.map(s => ({
      supplier_id: s.supplierId,
      product_links: s.productLinks || [],
      cost_price: s.costPrice,
      supplier_sku: s.supplierSku,
    })),
    status: data.status,
  })
  return response.data
}

/**
 * Delete procurement product (soft delete)
 * DELETE /api/v2/procurement/products/{id}
 */
export const deleteProcurementProduct = async (id: number) => {
  const response = await api.delete(`procurement/products/${id}`)
  return response.data
}

/**
 * Update procurement product status
 * PATCH /api/v2/procurement/products/{id}/status
 */
export const updateProcurementProductStatus = async (id: number, status: 'draft' | 'published') => {
  const response = await api.patch(`procurement/products/${id}/status`, { status })
  return response.data
}

/**
 * Get procurement statistics
 * GET /api/v2/procurement/statistics
 */
export const getProcurementStatistics = async () => {
  const response = await api.get('procurement/statistics')
  return response.data
}

/**
 * Get procurement products by supplier
 * GET /api/v2/procurement/suppliers/{id}/products
 */
export const getProcurementProductsBySupplier = async (supplierId: number, filters?: {
  status?: 'draft' | 'published' | 'all'
  per_page?: number
  page?: number
}) => {
  const params = new URLSearchParams()

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status)
  }
  if (filters?.per_page) {
    params.append('per_page', filters.per_page.toString())
  }
  if (filters?.page) {
    params.append('page', filters.page.toString())
  }

  const response = await api.get(`procurement/suppliers/${supplierId}/products${params.toString() ? '?' + params.toString() : ''}`)
  return response.data
}

// ============================================
// PURCHASE ORDERS API METHODS
// ============================================

export type PurchaseOrderItem = {
  id?: number  // Purchase order item ID (required for updating existing items)
  productId: number
  quantity: number
  chinaPrice: number
}

export type PurchaseOrder = {
  id?: number
  supplierId: number
  orderDate: string
  expectedDate?: string
  exchangeRate: number
  items: PurchaseOrderItem[]
}

export type PurchaseOrderFilters = {
  status?: string
  supplier_id?: number
  search?: string
  from_date?: string
  to_date?: string
  per_page?: number
  page?: number
}

/**
 * Get all purchase orders
 * GET /api/v2/procurement/orders
 */
export const getPurchaseOrders = async (filters?: PurchaseOrderFilters) => {
  const params = new URLSearchParams()

  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status)
  }
  if (filters?.supplier_id) {
    params.append('supplier_id', filters.supplier_id.toString())
  }
  if (filters?.search) {
    params.append('search', filters.search)
  }
  if (filters?.from_date) {
    params.append('from_date', filters.from_date)
  }
  if (filters?.to_date) {
    params.append('to_date', filters.to_date)
  }
  if (filters?.per_page) {
    params.append('per_page', filters.per_page.toString())
  }
  if (filters?.page) {
    params.append('page', filters.page.toString())
  }

  const response = await api.get(`procurement/orders${params.toString() ? '?' + params.toString() : ''}`)
  return response.data
}

/**
 * Get single purchase order
 * GET /api/v2/procurement/orders/{id}
 */
export const getPurchaseOrder = async (id: number) => {
  const response = await api.get(`procurement/orders/${id}`)
  return response.data
}

/**
 * Create new purchase order
 * POST /api/v2/procurement/orders
 */
export const createPurchaseOrder = async (data: PurchaseOrder) => {
  const response = await api.post('procurement/orders', {
    supplier_id: data.supplierId,
    order_date: data.orderDate,
    expected_date: data.expectedDate,
    exchange_rate: data.exchangeRate,
    items: data.items.map(item => ({
      product_id: item.productId,
      quantity: item.quantity,
      china_price: item.chinaPrice,
    })),
  })
  return response.data
}

/**
 * Update purchase order
 * PUT /api/v2/procurement/orders/{id}
 */
export const updatePurchaseOrder = async (id: number, data: PurchaseOrder) => {
  const response = await api.put(`procurement/orders/${id}`, {
    order_date: data.orderDate,
    expected_date: data.expectedDate,
    exchange_rate: data.exchangeRate,
    items: data.items.map(item => ({
      id: item.id,  // Include purchase order item ID for existing items
      product_id: item.productId,
      quantity: item.quantity,
      china_price: item.chinaPrice,
    })),
  })
  return response.data
}

/**
 * Update purchase order status
 * PATCH /api/v2/procurement/orders/{id}/status
 */
export const updatePurchaseOrderStatus = async (id: number, status: string, exchangeRate?: number, fullPayload?: any) => {
  // If fullPayload is provided, use it; otherwise build minimal payload
  const payload = fullPayload || { status }

  // Only add exchange_rate if it's provided and we're not using full payload
  if (!fullPayload && exchangeRate !== undefined) {
    payload.exchange_rate = exchangeRate
  }

  const response = await api.patch(`procurement/orders/${id}/status`, payload)
  return response.data
}

/**
 * Delete purchase order
 * DELETE /api/v2/procurement/orders/{id}
 */
export const deletePurchaseOrder = async (id: number) => {
  const response = await api.delete(`procurement/orders/${id}`)
  return response.data
}

/**
 * Get purchase order statistics
 * GET /api/v2/procurement/orders/statistics
 */
export const getPurchaseOrderStatistics = async () => {
  const response = await api.get('procurement/orders/statistics')
  return response.data
}

/**
 * Update status history comments
 * PATCH /api/v2/procurement/orders/{poId}/status-history/{historyId}/comments
 */
export const updateStatusHistoryComments = async (poId: number, historyId: number, comments: string) => {
  const response = await api.patch(`procurement/orders/${poId}/status-history/${historyId}/comments`, { comments })
  return response.data
}

// ============================================
// COUPONS / DISCOUNTS API METHODS
// ============================================

export type Coupon = {
  id: number
  code: string
  description?: string | null
  type: 'percentage' | 'fixed_amount'
  amount: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number | null
  startsAt?: string | null
  expiresAt?: string | null
  maxUses?: number | null
  usageLimitPerCustomer?: number | null
  usedCount: number
  isActive: boolean
  isAutoApply: boolean
  firstPurchaseOnly: boolean
  productIds?: number[] | null
  categoryIds?: number[] | null
  customerIds?: number[] | null
  createdAt: string
  updatedAt: string
}

export type CouponFilters = {
  search?: string
  is_active?: boolean
  type?: 'percentage' | 'fixed_amount'
  per_page?: number
  page?: number
}

export type CouponFormData = {
  code: string
  description?: string | null
  type: 'percentage' | 'fixed_amount'
  amount: number
  maxDiscountAmount?: number | null
  minOrderAmount?: number | null
  startsAt?: string | null
  expiresAt?: string | null
  maxUses?: number | null
  usageLimitPerCustomer?: number | null
  isActive?: boolean
  isAutoApply?: boolean
  firstPurchaseOnly?: boolean
  productIds?: number[] | null
  categoryIds?: number[] | null
  customerIds?: number[] | null
}

export type BulkGenerateData = {
  prefix: string
  quantity: number
} & Omit<CouponFormData, 'code'>

/**
 * Get coupons with optional filters
 * GET /api/v2/catalog/discounts
 */
export const getCoupons = async (filters?: CouponFilters) => {
  const params = new URLSearchParams()

  if (filters?.search) params.append('search', filters.search)
  if (filters?.type) params.append('type', filters.type)
  if (filters?.is_active !== undefined) params.append('is_active', filters.is_active ? '1' : '0')
  if (filters?.per_page) params.append('per_page', filters.per_page.toString())
  if (filters?.page) params.append('page', filters.page.toString())

  const response = await api.get(`catalog/discounts?${params}`)
  return response.data
}

/**
 * Get single coupon by ID
 * GET /api/v2/catalog/discounts/{id}
 */
export const getCoupon = async (id: number) => {
  const response = await api.get(`catalog/discounts/${id}`)
  return response.data
}

/**
 * Create a new coupon
 * POST /api/v2/catalog/discounts
 */
export const createCoupon = async (data: CouponFormData) => {
  const response = await api.post('catalog/discounts', {
    code: data.code.toUpperCase(),
    description: data.description,
    type: data.type,
    amount: data.amount,
    max_discount_amount: data.maxDiscountAmount,
    min_order_amount: data.minOrderAmount,
    starts_at: data.startsAt,
    expires_at: data.expiresAt,
    max_uses: data.maxUses,
    usage_limit_per_customer: data.usageLimitPerCustomer,
    is_active: data.isActive ?? true,
    is_auto_apply: data.isAutoApply ?? false,
    first_purchase_only: data.firstPurchaseOnly ?? false,
    product_ids: data.productIds,
    category_ids: data.categoryIds,
    customer_ids: data.customerIds,
  })
  return response.data
}

/**
 * Update a coupon
 * PUT /api/v2/catalog/discounts/{id}
 */
export const updateCoupon = async (id: number, data: Partial<CouponFormData>) => {
  const payload: Record<string, unknown> = {}
  if (data.code !== undefined) payload.code = data.code.toUpperCase()
  if (data.description !== undefined) payload.description = data.description
  if (data.type !== undefined) payload.type = data.type
  if (data.amount !== undefined) payload.amount = data.amount
  if (data.maxDiscountAmount !== undefined) payload.max_discount_amount = data.maxDiscountAmount
  if (data.minOrderAmount !== undefined) payload.min_order_amount = data.minOrderAmount
  if (data.startsAt !== undefined) payload.starts_at = data.startsAt
  if (data.expiresAt !== undefined) payload.expires_at = data.expiresAt
  if (data.maxUses !== undefined) payload.max_uses = data.maxUses
  if (data.usageLimitPerCustomer !== undefined) payload.usage_limit_per_customer = data.usageLimitPerCustomer
  if (data.isActive !== undefined) payload.is_active = data.isActive
  if (data.isAutoApply !== undefined) payload.is_auto_apply = data.isAutoApply
  if (data.firstPurchaseOnly !== undefined) payload.first_purchase_only = data.firstPurchaseOnly
  if (data.productIds !== undefined) payload.product_ids = data.productIds
  if (data.categoryIds !== undefined) payload.category_ids = data.categoryIds
  if (data.customerIds !== undefined) payload.customer_ids = data.customerIds

  const response = await api.put(`catalog/discounts/${id}`, payload)
  return response.data
}

/**
 * Delete a coupon
 * DELETE /api/v2/catalog/discounts/{id}
 */
export const deleteCoupon = async (id: number) => {
  const response = await api.delete(`catalog/discounts/${id}`)
  return response.data
}

/**
 * Bulk generate coupons
 * POST /api/v2/catalog/discounts/bulk-generate
 */
export const bulkGenerateCoupons = async (data: BulkGenerateData) => {
  const response = await api.post('catalog/discounts/bulk-generate', {
    prefix: data.prefix.toUpperCase(),
    quantity: data.quantity,
    description: data.description,
    type: data.type,
    amount: data.amount,
    max_discount_amount: data.maxDiscountAmount,
    min_order_amount: data.minOrderAmount,
    starts_at: data.startsAt,
    expires_at: data.expiresAt,
    max_uses: data.maxUses,
    usage_limit_per_customer: data.usageLimitPerCustomer,
    is_active: data.isActive ?? true,
    is_auto_apply: data.isAutoApply ?? false,
    first_purchase_only: data.firstPurchaseOnly ?? false,
    product_ids: data.productIds,
    category_ids: data.categoryIds,
    customer_ids: data.customerIds,
  })
  return response.data
}

/**
 * Check coupon validity against cart
 * POST /api/v2/catalog/discounts/check-validity
 */
export const checkCouponValidity = async (data: {
  code: string
  cartTotal: number
  userId?: number
  cartProductIds?: number[]
  cartCategoryIds?: number[]
}) => {
  const response = await api.post('catalog/discounts/check-validity', {
    code: data.code.toUpperCase(),
    cart_total: data.cartTotal,
    user_id: data.userId,
    cart_product_ids: data.cartProductIds,
    cart_category_ids: data.cartCategoryIds,
  })
  return response.data
}

/**
 * Toggle coupon active/inactive status
 * POST /api/v2/catalog/discounts/{id}/toggle-status
 */
export const toggleCouponStatus = async (id: number) => {
  const response = await api.post(`catalog/discounts/${id}/toggle-status`)
  return response.data
}
