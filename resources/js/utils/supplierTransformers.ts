/**
 * Pure data transformation functions for Supplier operations.
 *
 * These functions convert data between different formats (API ↔ Form ↔ UI).
 * All functions are pure and have no side effects.
 */

import type { Supplier, SupplierFormData } from '@/types/supplier'

// ============================================================================
// API → FORM DATA TRANSFORMERS
// ============================================================================

/**
 * Transform API supplier data to form data format
 *
 * @param supplier - Supplier object from API
 * @returns Form data for edit form
 *
 * @example
 * transformSupplierToFormData({
 *   id: 1,
 *   name: 'John',
 *   email: 'john@example.com',
 *   phone: '123456',
 *   whatsapp: null,
 *   // ...
 * })
 * // Returns: { name: 'John', email: 'john@example.com', phone: '123456', whatsapp: '', ... }
 */
export const transformSupplierToFormData = (
  supplier: Supplier
): SupplierFormData & {
  wechatQrFileCurrent: string | null
  alipayQrFileCurrent: string | null
} => {
  return {
    name: supplier.name || '',
    email: supplier.email || '',
    phone: supplier.phone || '',
    whatsapp: supplier.whatsapp || '',
    shopName: supplier.shopName || '',
    shopUrl: supplier.shopUrl || '',
    contactPerson: supplier.contactPerson || '',
    wechatId: supplier.wechatId || '',
    wechatQrUrl: supplier.wechatQrUrl || '',
    wechatQrFile: null,
    wechatQrFileCurrent: supplier.wechatQrFile || null,
    alipayId: supplier.alipayId || '',
    alipayQrUrl: supplier.alipayQrUrl || '',
    alipayQrFile: null,
    alipayQrFileCurrent: supplier.alipayQrFile || null,
    address: supplier.address || '',
    isActive: supplier.isActive ?? true,
  }
}

/**
 * Transform API supplier list to form data list
 *
 * @param suppliers - Array of suppliers from API
 * @returns Array of form data objects
 *
 * @example
 * transformSuppliersToFormData([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }])
 * // Returns: [{ name: 'John', ... }, { name: 'Jane', ... }]
 */
export const transformSuppliersToFormData = (
  suppliers: Supplier[]
): Array<ReturnType<typeof transformSupplierToFormData>> => {
  return suppliers.map(transformSupplierToFormData)
}

// ============================================================================
// FORM DATA → API TRANSFORMERS
// ============================================================================

/**
 * Field name mapping: camelCase (frontend) → snake_case (backend)
 */
const FIELD_MAPPING: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  whatsapp: 'whatsapp',
  shopName: 'shop_name',
  shopUrl: 'shop_url',
  contactPerson: 'contact_person',
  wechatId: 'wechat_id',
  wechatQrUrl: 'wechat_qr_url',
  alipayId: 'alipay_id',
  alipayQrUrl: 'alipay_qr_url',
  address: 'address',
  isActive: 'is_active',
}

/**
 * Transform form data to API payload (snake_case)
 *
 * @param formData - Form data from create/edit form
 * @returns FormData object for API submission
 *
 * @example
 * transformFormDataToApi({
 *   name: 'John',
 *   email: 'john@example.com',
 *   isActive: true,
 *   wechatQrFile: File,
 * })
 * // Returns: FormData with 'name', 'email', 'is_active', 'wechat_qr_file' fields
 */
export const transformFormDataToApi = (
  formData: SupplierFormData & {
    wechatQrFile?: File | null
    alipayQrFile?: File | null
  }
): FormData => {
  const payload = new FormData() as any

  // Add all text fields with correct field names
  Object.entries(FIELD_MAPPING).forEach(([camelKey, snakeKey]) => {
    // Skip QR URL fields - we only upload files, not URLs
    if (camelKey === 'wechatQrUrl' || camelKey === 'alipayQrUrl') {
      return
    }

    const value = formData[camelKey as keyof typeof formData]

    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'boolean') {
        payload.append(snakeKey, value ? '1' : '0')
      } else {
        payload.append(snakeKey, String(value))
      }
    }
  })

  // Add files if present
  if (formData.wechatQrFile) {
    payload.append('wechat_qr_file', formData.wechatQrFile)
  }
  if (formData.alipayQrFile) {
    payload.append('alipay_qr_file', formData.alipayQrFile)
  }

  return payload
}

/**
 * Transform form data to partial update payload
 *
 * @param formData - Form data from edit form (partial)
 * @returns Object with only changed fields (snake_case)
 *
 * @example
 * transformFormDataToPartialApi({ name: 'John', email: 'john@example.com' })
 * // Returns: { name: 'John', email: 'john@example.com' }
 */
export const transformFormDataToPartialApi = (
  formData: Partial<SupplierFormData>
): Record<string, any> => {
  const partial: Record<string, any> = {}

  Object.entries(formData).forEach(([camelKey, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      const snakeKey = FIELD_MAPPING[camelKey]
      if (snakeKey) {
        partial[snakeKey] =
          typeof value === 'boolean' ? (value ? '1' : '0') : value
      }
    }
  })

  return partial
}

// ============================================================================
// API → UI TRANSFORMERS
// ============================================================================

/**
 * Transform API supplier to UI display object
 *
 * @param supplier - Supplier object from API
 * @returns UI-friendly supplier object with computed properties
 *
 * @example
 * transformSupplierToUi({
 *   id: 1,
 *   name: 'John Doe',
 *   email: 'john@example.com',
 *   isActive: true,
 *   walletBalance: 1000,
 * })
 * // Returns: {
 *   ...supplier,
 *   displayName: 'John Doe',
 *   initials: 'JD',
 *   statusLabel: 'Active',
 *   statusColor: 'green',
 *   primaryContact: 'john@example.com',
 *   hasWeChat: false,
 *   hasAlipay: false,
 * }
 */
export const transformSupplierToUi = (
  supplier: Supplier
): Supplier & {
  displayName: string
  initials: string
  statusLabel: string
  statusColor: 'green' | 'gray'
  primaryContact: string
  hasWeChat: boolean
  hasAlipay: boolean
  paymentMethods: Array<'wechat' | 'alipay' | 'wallet' | 'bank'>
  completeness: number
} => {
  const hasWeChat = Boolean(
    supplier.wechatId || supplier.wechatQrUrl || supplier.wechatQrFile
  )
  const hasAlipay = Boolean(
    supplier.alipayId || supplier.alipayQrUrl || supplier.alipayQrFile
  )

  const paymentMethods: Array<'wechat' | 'alipay' | 'wallet' | 'bank'> = [
    'wallet',
    'bank',
  ]
  if (hasWeChat) paymentMethods.unshift('wechat')
  if (hasAlipay) paymentMethods.unshift('alipay')

  // Calculate completeness
  const fields = [
    supplier.name,
    supplier.email,
    supplier.phone,
    supplier.whatsapp,
    supplier.shopName,
    supplier.shopUrl,
    supplier.contactPerson,
    supplier.wechatId,
    supplier.wechatQrUrl,
    supplier.alipayId,
    supplier.alipayQrUrl,
    supplier.address,
  ]
  const filledFields = fields.filter(
    (f) => f !== null && f !== undefined && f !== ''
  )
  const completeness = Math.round((filledFields.length / fields.length) * 100)

  // Get initials
  const names = supplier.name.trim().split(' ')
  const initials =
    names.length >= 2
      ? (names[0][0] + names[names.length - 1][0]).toUpperCase()
      : supplier.name.slice(0, 2).toUpperCase()

  return {
    ...supplier,
    displayName: supplier.name,
    initials,
    statusLabel: supplier.isActive ? 'Active' : 'Inactive',
    statusColor: supplier.isActive ? 'green' : 'gray',
    primaryContact: supplier.email || supplier.phone || 'N/A',
    hasWeChat,
    hasAlipay,
    paymentMethods,
    completeness,
  }
}

/**
 * Transform API supplier list to UI display list
 *
 * @param suppliers - Array of suppliers from API
 * @returns Array of UI-friendly supplier objects
 *
 * @example
 * transformSuppliersToUi([{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }])
 * // Returns: [{ id: 1, name: 'John', displayName: 'John', initials: 'JO', ... }, ...]
 */
export const transformSuppliersToUi = (
  suppliers: Supplier[]
): Array<ReturnType<typeof transformSupplierToUi>> => {
  return suppliers.map(transformSupplierToUi)
}

// ============================================================================
// UI → API TRANSFORMERS
// ============================================================================

/**
 * Transform UI filter state to API query parameters
 *
 * @param filters - Filter state from UI
 * @returns API query parameters object
 *
 * @example
 * transformFiltersToApi({ search: 'john', isActive: true, page: 1, perPage: 15 })
 * // Returns: { search: 'john', is_active: '1', page: 1, per_page: 15 }
 */
export const transformFiltersToApi = (filters: {
  search?: string | null
  isActive?: boolean | null
  page?: number
  perPage?: number
}): Record<string, string | number> => {
  const params: Record<string, string | number> = {}

  if (filters.search) {
    params.search = filters.search
  }

  if (filters.isActive !== null && filters.isActive !== undefined) {
    params.is_active = filters.isActive ? '1' : '0'
  }

  if (filters.page) {
    params.page = filters.page
  }

  if (filters.perPage) {
    params.per_page = filters.perPage
  }

  return params
}

// ============================================================================
// SEARCH/SORT TRANSFORMERS
// ============================================================================

/**
 * Transform search query to debounced search query
 *
 * @param query - Raw search query
 * @param delay - Debounce delay in ms
 * @returns Debounced query (identity function, actual debouncing in hook)
 *
 * @example
 * debounceSearchQuery('john', 500)
 * // Returns: 'john' (actual debouncing happens in useDebouncedValue hook)
 */
export const debounceSearchQuery = (query: string): string => {
  return query.trim()
}

/**
 * Transform sort parameter to API sort format
 *
 * @param field - Field to sort by
 * @param direction - Sort direction
 * @returns API sort parameter string
 *
 * @example
 * transformSortToApi('name', 'asc') // 'name'
 * transformSortToApi('createdAt', 'desc') // '-created_at'
 */
export const transformSortToApi = (
  field: string,
  direction: 'asc' | 'desc' = 'asc'
): string => {
  const fieldMap: Record<string, string> = {
    name: 'name',
    email: 'email',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    walletBalance: 'wallet_balance',
  }

  const apiField = fieldMap[field] || field
  return direction === 'desc' ? `-${apiField}` : apiField
}

// ============================================================================
// FILE TRANSFORMERS
// ============================================================================

/**
 * Transform file object to preview URL
 *
 * @param file - File object
 * @returns Promise resolving to preview URL
 *
 * @example
 * await transformFileToPreview(file)
 * // Returns: 'blob:http://localhost:3000/abc-123-def'
 */
export const transformFileToPreview = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Transform API file path to full URL
 *
 * @param path - File path from API
 * @param baseUrl - Base URL for storage
 * @returns Full URL to file
 *
 * @example
 * transformFileUrlToFull('suppliers/qr/abc.jpg', 'http://localhost:8000/storage')
 * // Returns: 'http://localhost:8000/storage/suppliers/qr/abc.jpg'
 */
export const transformFileUrlToFull = (
  path: string | null,
  baseUrl: string = '/storage'
): string | null => {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${baseUrl}/${path.replace(/^\//, '')}`
}

// ============================================================================
// PAGINATION TRANSFORMERS
// ============================================================================

/**
 * Transform API pagination response to UI pagination state
 *
 * @param meta - Meta object from API response
 * @returns UI pagination state
 *
 * @example
 * transformPaginationToUi({
 *   current_page: 1,
 *   per_page: 15,
 *   total: 100,
 *   last_page: 7,
 * })
 * // Returns: { page: 1, perPage: 15, total: 100, lastPage: 7 }
 */
export const transformPaginationToUi = (meta: {
  current_page: number
  per_page: number
  total: number
  last_page: number
}): {
  page: number
  perPage: number
  total: number
  lastPage: number
} => {
  return {
    page: meta.current_page,
    perPage: meta.per_page,
    total: meta.total,
    lastPage: meta.last_page,
  }
}

/**
 * Transform UI pagination state to API query parameters
 *
 * @param pagination - UI pagination state
 * @returns API query parameters
 *
 * @example
 * transformPaginationToApi({ page: 1, perPage: 15, total: 100, lastPage: 7 })
 * // Returns: { page: 1, per_page: 15 }
 */
export const transformPaginationToApi = (pagination: {
  page: number
  perPage: number
}): { page: number; per_page: number } => {
  return {
    page: pagination.page,
    per_page: pagination.perPage,
  }
}

// ============================================================================
// ERROR TRANSFORMERS
// ============================================================================

/**
 * Transform API error to user-friendly message
 *
 * @param error - Error object from API
 * @returns User-friendly error message
 *
 * @example
 * transformApiErrorToMessage({ response: { status: 422, data: { message: 'Validation failed' } } })
 * // Returns: 'Validation failed'
 */
export const transformApiErrorToMessage = (error: any): string => {
  if (error?.response?.data?.message) {
    return error.response.data.message
  }

  if (error?.response?.status === 422) {
    return 'Validation failed. Please check your input.'
  }

  if (error?.response?.status === 403) {
    return 'You do not have permission to perform this action.'
  }

  if (error?.response?.status === 404) {
    return 'The requested resource was not found.'
  }

  if (error?.response?.status === 500) {
    return 'Server error. Please try again later.'
  }

  return error?.message || 'An unexpected error occurred'
}

/**
 * Transform Laravel validation errors to frontend format
 *
 * @param error - Error object from API
 * @returns Formatted errors object
 *
 * @example
 * transformValidationErrors({ response: { status: 422, data: { errors: { email: ['Invalid email'] } } } })
 * // Returns: { email: 'Invalid email' }
 */
export const transformValidationErrors = (
  error: any
): Record<string, string> => {
  if (error?.response?.status === 422) {
    const backendErrors = error.response.data?.errors || {}
    const formattedErrors: Record<string, string> = {}

    Object.entries(backendErrors).forEach(([snakeCaseField, messages]) => {
      // Convert snake_case to camelCase
      // Example: shop_url → shopUrl, wechat_qr_url → wechatQrUrl
      const camelCaseField = snakeCaseField.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())

      formattedErrors[camelCaseField] = Array.isArray(messages) ? messages[0] : String(messages)
    })

    return formattedErrors
  }

  return {}
}
