/**
 * Supplier type definitions
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Supplier {
  id: number
  name: string
  email: string
  phone: string | null
  whatsapp: string | null
  shopName: string | null
  shopUrl: string | null
  contactPerson: string | null
  wechatId: string | null
  wechatQrFile: string | null
  wechatQrUrl: string | null
  alipayId: string | null
  alipayQrFile: string | null
  alipayQrUrl: string | null
  address: string | null
  isActive: boolean
  walletBalance: number
  creditLimit: number
  createdAt: string
  updatedAt: string
}

export interface SupplierFormData {
  name: string
  email: string
  phone?: string
  whatsapp?: string
  shopName?: string
  shopUrl?: string
  contactPerson?: string
  wechatId?: string
  wechatQrUrl?: string
  wechatQrFile?: File | null
  alipayId?: string
  alipayQrUrl?: string
  alipayQrFile?: File | null
  address?: string
  isActive?: boolean
}

export interface SupplierFilters {
  search?: string | null
  isActive?: boolean | null
  page?: number
  per_page?: number
}

export interface SupplierPagination {
  current_page: number
  per_page: number
  total: number
  last_page: number
  from: number
  to: number
}

export interface SuppliersResponse {
  data: Supplier[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
}
