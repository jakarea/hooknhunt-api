/**
 * Pure helper functions for Supplier operations.
 *
 * These functions have no side effects and are easily testable.
 * They perform calculations, formatting, and data transformations.
 */

import type { Supplier, SupplierFormData } from '@/types/supplier'

// ============================================================================
// SUPPLIER STATUS HELPERS
// ============================================================================

/**
 * Check if a supplier is active
 *
 * @param supplier - Supplier object
 * @returns true if supplier is active
 *
 * @example
 * isSupplierActive({ isActive: true }) // true
 * isSupplierActive({ isActive: false }) // false
 */
export const isSupplierActive = (supplier: Supplier): boolean => {
  return supplier.isActive === true
}

/**
 * Get supplier status label
 *
 * @param supplier - Supplier object
 * @returns Status label ('Active' or 'Inactive')
 *
 * @example
 * getSupplierStatusLabel({ isActive: true }) // 'Active'
 * getSupplierStatusLabel({ isActive: false }) // 'Inactive'
 */
export const getSupplierStatusLabel = (supplier: Supplier): string => {
  return isSupplierActive(supplier) ? 'Active' : 'Inactive'
}

/**
 * Get supplier status color for UI
 *
 * @param supplier - Supplier object
 * @returns Color name for Mantine components
 *
 * @example
 * getSupplierStatusColor({ isActive: true }) // 'green'
 * getSupplierStatusColor({ isActive: false }) // 'red'
 */
export const getSupplierStatusColor = (supplier: Supplier): 'green' | 'gray' => {
  return isSupplierActive(supplier) ? 'green' : 'gray'
}

// ============================================================================
// SUPPLIER WALLET HELPERS
// ============================================================================

/**
 * Format wallet balance as currency
 *
 * @param balance - Wallet balance number
 * @param currency - Currency symbol (default: '৳')
 * @returns Formatted currency string
 *
 * @example
 * formatWalletBalance(1234.56) // '৳1,234.56'
 * formatWalletBalance(0) // '৳0.00'
 */
export const formatWalletBalance = (
  balance: number,
  currency: string = '৳'
): string => {
  return `${currency}${balance.toFixed(2)}`
}

/**
 * Check if supplier has sufficient wallet balance
 *
 * @param supplier - Supplier object
 * @param amount - Amount to check
 * @returns true if balance is sufficient
 *
 * @example
 * hasSufficientBalance({ walletBalance: 100 }, 50) // true
 * hasSufficientBalance({ walletBalance: 100 }, 150) // false
 */
export const hasSufficientBalance = (
  supplier: Supplier,
  amount: number
): boolean => {
  return supplier.walletBalance >= amount
}

/**
 * Calculate remaining credit limit
 *
 * @param supplier - Supplier object
 * @returns Available credit amount
 *
 * @example
 * getAvailableCredit({ walletBalance: 100, creditLimit: 500 }) // 500
 * getAvailableCredit({ walletBalance: -100, creditLimit: 500 }) // 400
 */
export const getAvailableCredit = (supplier: Supplier): number => {
  return supplier.creditLimit - supplier.walletBalance
}

// ============================================================================
// SUPPLIER CONTACT HELPERS
// ============================================================================

/**
 * Get primary contact method for supplier
 *
 * @param supplier - Supplier object
 * @returns Primary contact (email or phone)
 *
 * @example
 * getPrimaryContact({ email: 'test@example.com', phone: '123456' }) // 'test@example.com'
 * getPrimaryContact({ email: '', phone: '123456' }) // '123456'
 */
export const getPrimaryContact = (supplier: Supplier): string => {
  return supplier.email || supplier.phone || 'N/A'
}

/**
 * Check if supplier has WhatsApp
 *
 * @param supplier - Supplier object
 * @returns true if WhatsApp number exists
 *
 * @example
 * hasWhatsApp({ whatsapp: '123456' }) // true
 * hasWhatsApp({ whatsapp: null }) // false
 */
export const hasWhatsApp = (supplier: Supplier): boolean => {
  return Boolean(supplier.whatsapp && supplier.whatsapp.trim().length > 0)
}

/**
 * Get WhatsApp link (wa.me)
 *
 * @param supplier - Supplier object
 * @returns WhatsApp chat link or null
 *
 * @example
 * getWhatsAppLink({ whatsapp: '1234567890' }) // 'https://wa.me/1234567890'
 * getWhatsAppLink({ whatsapp: null }) // null
 */
export const getWhatsAppLink = (supplier: Supplier): string | null => {
  if (!hasWhatsApp(supplier)) return null
  const cleanNumber = supplier.whatsapp!.replace(/\D/g, '') // Remove non-digits
  return `https://wa.me/${cleanNumber}`
}

// ============================================================================
// SUPPLIER PAYMENT HELPERS
// ============================================================================

/**
 * Check if supplier has WeChat Pay configured
 *
 * @param supplier - Supplier object
 * @returns true if WeChat Pay is configured
 *
 * @example
 * hasWeChatPay({ wechatId: 'abc123' }) // true
 * hasWeChatPay({ wechatId: null }) // false
 */
export const hasWeChatPay = (supplier: Supplier): boolean => {
  return Boolean(
    supplier.wechatId ||
    supplier.wechatQrUrl ||
    supplier.wechatQrFile
  )
}

/**
 * Check if supplier has Alipay configured
 *
 * @param supplier - Supplier object
 * @returns true if Alipay is configured
 *
 * @example
 * hasAlipay({ alipayId: 'abc123' }) // true
 * hasAlipay({ alipayId: null }) // false
 */
export const hasAlipay = (supplier: Supplier): boolean => {
  return Boolean(
    supplier.alipayId ||
    supplier.alipayQrUrl ||
    supplier.alipayQrFile
  )
}

/**
 * Get available payment methods for supplier
 *
 * @param supplier - Supplier object
 * @returns Array of available payment methods
 *
 * @example
 * getPaymentMethods({ wechatId: 'abc', alipayId: null })
 * // ['wechat', 'wallet', 'bank']
 */
export const getPaymentMethods = (
  supplier: Supplier
): Array<'wechat' | 'alipay' | 'wallet' | 'bank'> => {
  const methods: Array<'wechat' | 'alipay' | 'wallet' | 'bank'> = ['wallet', 'bank']

  if (hasWeChatPay(supplier)) {
    methods.unshift('wechat')
  }

  if (hasAlipay(supplier)) {
    methods.unshift('alipay')
  }

  return methods
}

// ============================================================================
// SUPPLIER SHOP HELPERS
// ============================================================================

/**
 * Check if supplier has shop information
 *
 * @param supplier - Supplier object
 * @returns true if shop name or URL exists
 *
 * @example
 * hasShopInfo({ shopName: 'My Shop' }) // true
 * hasShopInfo({ shopName: null, shopUrl: null }) // false
 */
export const hasShopInfo = (supplier: Supplier): boolean => {
  return Boolean(
    supplier.shopName ||
    supplier.shopUrl ||
    supplier.contactPerson
  )
}

/**
 * Get shop display name
 *
 * @param supplier - Supplier object
 * @returns Shop name or supplier name as fallback
 *
 * @example
 * getShopDisplayName({ shopName: 'My Shop', name: 'John' }) // 'My Shop'
 * getShopDisplayName({ shopName: null, name: 'John' }) // 'John'
 */
export const getShopDisplayName = (supplier: Supplier): string => {
  return supplier.shopName || supplier.name
}

/**
 * Validate shop URL format
 *
 * @param url - URL string to validate
 * @returns true if valid URL
 *
 * @example
 * isValidShopUrl('https://example.com') // true
 * isValidShopUrl('not-a-url') // false
 */
export const isValidShopUrl = (url: string): boolean => {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// SUPPLIER SEARCH/FILTER HELPERS
// ============================================================================

/**
 * Check if supplier matches search query
 *
 * @param supplier - Supplier object
 * @param query - Search query string
 * @returns true if supplier matches query
 *
 * @example
 * supplierMatchesSearch({ name: 'John Doe', email: 'john@example.com' }, 'john')
 * // true (matches name)
 */
export const supplierMatchesSearch = (
  supplier: Supplier,
  query: string
): boolean => {
  if (!query) return true

  const searchLower = query.toLowerCase()
  return (
    supplier.name.toLowerCase().includes(searchLower) ||
    supplier.email.toLowerCase().includes(searchLower) ||
    (supplier.phone && supplier.phone.includes(searchLower)) ||
    (supplier.shopName && supplier.shopName.toLowerCase().includes(searchLower))
  )
}

/**
 * Filter suppliers by search query
 *
 * @param suppliers - Array of suppliers
 * @param query - Search query string
 * @returns Filtered array of suppliers
 *
 * @example
 * filterSuppliersBySearch([{ name: 'John' }, { name: 'Jane' }], 'john')
 * // [{ name: 'John' }]
 */
export const filterSuppliersBySearch = (
  suppliers: Supplier[],
  query: string
): Supplier[] => {
  if (!query) return suppliers
  return suppliers.filter((s) => supplierMatchesSearch(s, query))
}

/**
 * Filter suppliers by active status
 *
 * @param suppliers - Array of suppliers
 * @param isActive - Filter by active status (null = all)
 * @returns Filtered array of suppliers
 *
 * @example
 * filterSuppliersByStatus([{ isActive: true }, { isActive: false }], true)
 * // [{ isActive: true }]
 */
export const filterSuppliersByStatus = (
  suppliers: Supplier[],
  isActive: boolean | null
): Supplier[] => {
  if (isActive === null) return suppliers
  return suppliers.filter((s) => s.isActive === isActive)
}

/**
 * Sort suppliers by name
 *
 * @param suppliers - Array of suppliers
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of suppliers
 *
 * @example
 * sortSuppliersByName([{ name: 'Jane' }, { name: 'John' }], 'asc')
 * // [{ name: 'Jane' }, { name: 'John' }]
 */
export const sortSuppliersByName = (
  suppliers: Supplier[],
  direction: 'asc' | 'desc' = 'asc'
): Supplier[] => {
  return [...suppliers].sort((a, b) => {
    const compare = a.name.localeCompare(b.name)
    return direction === 'asc' ? compare : -compare
  })
}

/**
 * Sort suppliers by creation date
 *
 * @param suppliers - Array of suppliers
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of suppliers
 *
 * @example
 * sortSuppliersByDate([{ createdAt: '2024-01-02' }, { createdAt: '2024-01-01' }], 'desc')
 * // [{ createdAt: '2024-01-02' }, { createdAt: '2024-01-01' }]
 */
export const sortSuppliersByDate = (
  suppliers: Supplier[],
  direction: 'asc' | 'desc' = 'desc'
): Supplier[] => {
  return [...suppliers].sort((a, b) => {
    const compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    return direction === 'asc' ? compare : -compare
  })
}

// ============================================================================
// SUPPLIER DISPLAY HELPERS
// ============================================================================

/**
 * Get supplier display text
 *
 * @param supplier - Supplier object
 * @returns Formatted display string
 *
 * @example
 * getSupplierDisplayText({ name: 'John', email: 'john@example.com' })
 * // 'John (john@example.com)'
 */
export const getSupplierDisplayText = (supplier: Supplier): string => {
  if (supplier.email) {
    return `${supplier.name} (${supplier.email})`
  }
  return supplier.name
}

/**
 * Get supplier initials for avatar
 *
 * @param supplier - Supplier object
 * @returns Initials (max 2 characters)
 *
 * @example
 * getSupplierInitials({ name: 'John Doe' }) // 'JD'
 * getSupplierInitials({ name: 'John' }) // 'JO'
 */
export const getSupplierInitials = (supplier: Supplier): string => {
  const names = supplier.name.trim().split(' ')
  if (names.length >= 2) {
    return (names[0][0] + names[names.length - 1][0]).toUpperCase()
  }
  return supplier.name.slice(0, 2).toUpperCase()
}

/**
 * Truncate supplier name for display
 *
 * @param supplier - Supplier object
 * @param maxLength - Maximum length
 * @returns Truncated name with ellipsis if needed
 *
 * @example
 * truncateSupplierName({ name: 'Very Long Supplier Name' }, 15)
 * // 'Very Long Sup...'
 */
export const truncateSupplierName = (
  supplier: Supplier,
  maxLength: number = 30
): string => {
  if (supplier.name.length <= maxLength) return supplier.name
  return `${supplier.name.slice(0, maxLength - 3)}...`
}

// ============================================================================
// SUPPLIER VALIDATION HELPERS
// ============================================================================

/**
 * Check if supplier data is complete
 *
 * @param supplier - Supplier object
 * @returns true if all required fields are present
 *
 * @example
 * isSupplierComplete({ name: 'John', email: 'john@example.com', isActive: true, ... })
 * // true
 */
export const isSupplierComplete = (supplier: Partial<Supplier>): boolean => {
  return Boolean(
    supplier.name &&
    supplier.email &&
    typeof supplier.isActive === 'boolean'
  )
}

/**
 * Get supplier completeness percentage
 *
 * @param supplier - Supplier object
 * @returns Completeness percentage (0-100)
 *
 * @example
 * getSupplierCompleteness({ name: 'John', email: 'john@example.com', phone: null, ... })
 * // 60 (approximate, based on filled fields)
 */
export const getSupplierCompleteness = (supplier: Partial<Supplier>): number => {
  const fields = [
    'name',
    'email',
    'phone',
    'whatsapp',
    'shopName',
    'shopUrl',
    'contactPerson',
    'wechatId',
    'wechatQrUrl',
    'alipayId',
    'alipayQrUrl',
    'address',
  ]

  const filledFields = fields.filter((field) => {
    const value = supplier[field as keyof Supplier]
    return value !== null && value !== undefined && value !== ''
  })

  return Math.round((filledFields.length / fields.length) * 100)
}

// ============================================================================
// SUPPLIER COMPARISON HELPERS
// ============================================================================

/**
 * Compare two suppliers for equality
 *
 * @param supplier1 - First supplier
 * @param supplier2 - Second supplier
 * @returns true if suppliers are equal (excluding timestamps)
 *
 * @example
 * areSuppliersEqual({ name: 'John', email: 'john@example.com' }, { name: 'John', email: 'john@example.com' })
 * // true
 */
export const areSuppliersEqual = (
  supplier1: Supplier,
  supplier2: Supplier
): boolean => {
  return (
    supplier1.name === supplier2.name &&
    supplier1.email === supplier2.email &&
    supplier1.phone === supplier2.phone &&
    supplier1.whatsapp === supplier2.whatsapp &&
    supplier1.shopName === supplier2.shopName &&
    supplier1.shopUrl === supplier2.shopUrl &&
    supplier1.contactPerson === supplier2.contactPerson &&
    supplier1.wechatId === supplier2.wechatId &&
    supplier1.wechatQrUrl === supplier2.wechatQrUrl &&
    supplier1.alipayId === supplier2.alipayId &&
    supplier1.alipayQrUrl === supplier2.alipayQrUrl &&
    supplier1.address === supplier2.address &&
    supplier1.isActive === supplier2.isActive
  )
}

/**
 * Get changed fields between two suppliers
 *
 * @param original - Original supplier
 * @param updated - Updated supplier
 * @returns Array of changed field names
 *
 * @example
 * getSupplierChanges({ name: 'John', email: 'john@example.com' }, { name: 'Jane', email: 'john@example.com' })
 * // ['name']
 */
export const getSupplierChanges = (
  original: Supplier,
  updated: Partial<Supplier>
): string[] => {
  const changes: string[] = []

  const fieldsToCompare: Array<keyof Supplier> = [
    'name',
    'email',
    'phone',
    'whatsapp',
    'shopName',
    'shopUrl',
    'contactPerson',
    'wechatId',
    'wechatQrUrl',
    'alipayId',
    'alipayQrUrl',
    'address',
    'isActive',
  ]

  fieldsToCompare.forEach((field) => {
    if (updated[field] !== undefined && updated[field] !== original[field]) {
      changes.push(field)
    }
  })

  return changes
}
