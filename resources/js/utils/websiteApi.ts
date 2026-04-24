import { api } from '@/lib/api'

// ============================================
// TYPES
// ============================================

export type WebsiteOrderStatus = 'pending' | 'draft' | 'processing' | 'on_hold' | 'approved' | 'on_shipping' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'returned' | 'refunded'
export type PaymentStatus = 'unpaid' | 'paid' | 'partial'
export type OrderChannel = 'retail_web' | 'wholesale_web' | 'app'

export type WebsiteOrderCustomer = {
  id: number
  name: string
  phone: string
  type: string
}

export type WebsiteOrderItem = {
  id: number
  productVariantId: number
  productId: number | null
  productName: string
  wholesaleName: string | null
  variantName: string
  sku: string | null
  thumbnail: string | null
  variantWeight: number
  quantity: number
  unitPrice: number
  originalPrice: number | null
  offerPrice: number | null
  totalPrice: number
  totalCost: number
  profit: number
  weight: number
  totalWeight: number
  slug: string | null
}

export type WebsiteOrderDetail = {
  id: number
  invoiceNo: string
  channel: OrderChannel
  status: WebsiteOrderStatus
  statusLabel: string
  paymentStatus: PaymentStatus
  deliveryStatus: string | null
  subTotal: number
  discountAmount: number
  deliveryCharge: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  isPaid: boolean
  totalWeight: number
  totalProfit: number
  couponCode: string | null
  note: string | null
  editingLocked: boolean
  sentToCourier: boolean
  consignmentId: string | null
  trackingCode: string | null
  trackingLink: string | null
  shipping: {
    address: string | null
    district: string | null
    division: string | null
    thana: string | null
  }
  customerInfo: Record<string, any>
  payment: Record<string, any>
  soldBy: { id: number; name: string } | null
  items: WebsiteOrderItem[]
  allowedNextStatuses: WebsiteOrderStatus[]
  isEditable: boolean
  canSendToCourier: boolean
  statusHistory: Array<{
    id: number
    fromStatus: string | null
    toStatus: string
    comment: string | null
    changedBy: string | null
    createdAt: string
  }>
  recentActivities: Array<{
    id: number
    action: string
    description: string | null
    oldData: any
    newData: any
    performedBy: string | null
    createdAt: string
  }>
  timestamps: {
    createdAt: string
    confirmedAt: string | null
    shippedAt: string | null
    cancelledAt: string | null
  }
}

export type WebsiteOrderListItem = {
  id: number
  invoiceNo: string
  channel: OrderChannel
  status: WebsiteOrderStatus
  statusLabel: string
  paymentStatus: PaymentStatus
  deliveryStatus: string | null
  subTotal: number
  discountAmount: number
  deliveryCharge: number
  totalAmount: number
  paidAmount: number
  dueAmount: number
  totalWeight: number
  itemCount: number
  sentToCourier: boolean
  trackingCode: string | null
  customer: WebsiteOrderCustomer | null
  shippingDivision: string | null
  isEditable: boolean
  createdAt: string
  shippedAt: string | null
}

export type WebsiteOrderFilters = {
  search?: string
  status?: WebsiteOrderStatus | ''
  paymentStatus?: PaymentStatus | ''
  channel?: OrderChannel | ''
  fromDate?: string
  toDate?: string
  page?: number
  perPage?: number
}

export type WebsiteOrderStats = {
  total: number
  pending: number
  processing: number
  onHold: number
  approved: number
  onShipping: number
  shipped: number
  completed: number
  cancelled: number
  returned: number
  totalRevenue: number
  totalPendingAmount: number
  todayOrders: number
  todayRevenue: number
}

// ============================================
// API METHODS
// ============================================

export const getWebsiteOrders = async (filters?: WebsiteOrderFilters) => {
  const params = new URLSearchParams()
  if (filters?.search) params.append('search', filters.search)
  if (filters?.status) params.append('status', filters.status)
  if (filters?.paymentStatus) params.append('payment_status', filters.paymentStatus)
  if (filters?.channel) params.append('channel', filters.channel)
  if (filters?.fromDate) params.append('from_date', filters.fromDate)
  if (filters?.toDate) params.append('to_date', filters.toDate)
  if (filters?.page) params.append('page', String(filters.page))
  if (filters?.perPage) params.append('per_page', String(filters.perPage))

  const response = await api.get(`website-admin/orders?${params}`)
  return response.data
}

export const getWebsiteOrder = async (id: number) => {
  const response = await api.get(`website-admin/orders/${id}`)
  return response.data
}

export const updateWebsiteOrderStatus = async (id: number, data: { status: WebsiteOrderStatus; comment?: string }) => {
  const response = await api.put(`website-admin/orders/${id}/status`, data)
  return response.data
}

export const updateWebsiteOrderPayment = async (id: number, data: { paymentStatus: PaymentStatus; paidAmount: number }) => {
  const response = await api.put(`website-admin/orders/${id}/payment`, {
    payment_status: data.paymentStatus,
    paid_amount: data.paidAmount,
  })
  return response.data
}

export const updateWebsiteOrder = async (id: number, data: Record<string, any>) => {
  const response = await api.put(`website-admin/orders/${id}`, data)
  return response.data
}

export const addWebsiteOrderItem = async (orderId: number, data: { product_variant_id: number; quantity: number; unit_price?: number; weight?: number }) => {
  const response = await api.post(`website-admin/orders/${orderId}/items`, data)
  return response.data
}

export const updateWebsiteOrderItem = async (orderId: number, itemId: number, data: Record<string, any>) => {
  const response = await api.put(`website-admin/orders/${orderId}/items/${itemId}`, data)
  return response.data
}

export const removeWebsiteOrderItem = async (orderId: number, itemId: number) => {
  const response = await api.delete(`website-admin/orders/${orderId}/items/${itemId}`)
  return response.data
}

export type ProductVariantSearchResult = {
  variantId: number
  productName: string
  wholesaleName: string | null
  variantName: string
  sku: string
  price: number
  weight: number
  thumbnail: string | null
  stock: number
}

export const searchProductVariants = async (query: string) => {
  const response = await api.get('website-admin/products/search', { params: { q: query } })
  return response.data
}

export type ProductSearchResult = {
  id: number
  name: string
  wholesaleName: string | null
  thumbnail: string | null
  variantsCount: number
  totalSold?: number
}

export const searchProducts = async (query: string) => {
  const response = await api.get('website-admin/products/search-products', { params: { q: query } })
  return response.data
}

export const getTopSellingProducts = async () => {
  const response = await api.get('website-admin/products/top-selling')
  return response.data
}

export const getProductVariants = async (productId: number) => {
  const response = await api.get(`website-admin/products/${productId}/variants`)
  return response.data
}

export const sendOrderToCourier = async (id: number) => {
  const response = await api.post(`website-admin/orders/${id}/send-to-courier`)
  return response.data
}

export const syncCourierStatus = async (id: number) => {
  const response = await api.post(`website-admin/orders/${id}/sync-courier`)
  return response.data
}

export const calculateDeliveryCharge = async (weight: number, division: string) => {
  const response = await api.post('website-admin/orders/calculate-delivery', { weight, division })
  return response.data
}

export const getWebsiteOrderStats = async () => {
  const response = await api.get('website-admin/orders/statistics')
  return response.data
}

export const getOrderStatusHistory = async (id: number) => {
  const response = await api.get(`website-admin/orders/${id}/status-history`)
  return response.data
}

export const getOrderActivityLog = async (id: number) => {
  const response = await api.get(`website-admin/orders/${id}/activity-log`)
  return response.data
}

export const sendOrderSms = async (id: number, message: string) => {
  const response = await api.post(`website-admin/orders/${id}/send-sms`, { message })
  return response.data
}

// ============================================
// WEBSITE SETTINGS API
// ============================================

export const getWebsiteSettings = async () => {
  const response = await api.get('website-admin/settings')
  return response.data
}

export const updateWebsiteSettings = async (settings: {
  facebook_pixel_id?: string | null
  facebook_pixel_code?: string | null
  google_analytics_id?: string | null
  google_analytics_code?: string | null
  google_tag_manager_id?: string | null
  google_tag_manager_code?: string | null
}) => {
  const response = await api.put('website-admin/settings', settings)
  return response.data
}

export type WebsiteSettings = {
  facebook_pixel_id: string | null
  facebook_pixel_code: string | null
  google_analytics_id: string | null
  google_analytics_code: string | null
  google_tag_manager_id: string | null
  google_tag_manager_code: string | null
}


// ============================================
// HELPERS
// ============================================

export const statusColors: Record<WebsiteOrderStatus, string> = {
  pending: 'yellow',
  draft: 'gray',
  processing: 'blue',
  on_hold: 'orange',
  approved: 'teal',
  on_shipping: 'cyan',
  shipped: 'indigo',
  delivered: 'green',
  completed: 'green',
  cancelled: 'red',
  returned: 'orange',
  refunded: 'violet',
}

export const statusLabels: Record<WebsiteOrderStatus, string> = {
  pending: 'Pending',
  draft: 'Draft',
  processing: 'Processing',
  on_hold: 'On Hold',
  approved: 'Approved',
  on_shipping: 'On Shipping',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  returned: 'Returned',
  refunded: 'Refunded',
}

export const paymentStatusColors: Record<PaymentStatus, string> = {
  unpaid: 'red',
  paid: 'green',
  partial: 'orange',
}

export const channelLabels: Record<OrderChannel, string> = {
  retail_web: 'Website',
  wholesale_web: 'Wholesale',
  app: 'App',
}

export const formatCurrency = (amount: number | string | undefined | null): string => {
  return (Number(amount ?? 0)).toLocaleString('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 })
}

export const decodeHtmlEntities = (text: string | undefined | null): string => {
  if (!text) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = text
  return txt.value
}

// ============================================
// SLIDER TYPES & API
// ============================================

export type SliderMediaType = 'image' | 'video'

export type Slider = {
  id: number
  mediaType: SliderMediaType
  imageUrl: string | null
  videoUrl: string | null
  capsuleTitle: string | null
  title: string
  subTitle: string | null
  features: string | null
  featuresList: string[]
  cta1Label: string | null
  cta1Link: string | null
  cta2Label: string | null
  cta2Link: string | null
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SliderFormData = {
  mediaType: SliderMediaType
  imageUrl?: string | null
  videoUrl?: string | null
  capsuleTitle?: string
  title: string
  subTitle?: string
  features?: string
  cta1Label?: string
  cta1Link?: string
  cta2Label?: string
  cta2Link?: string
  isActive?: boolean
}

export const getSliders = async () => {
  const response = await api.get('website-admin/sliders')
  return response.data
}

const toSnakeCase = (data: Record<string, any>): Record<string, any> => {
  const mapped: Record<string, any> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
    mapped[snakeKey] = value
  }
  return mapped
}

export const createSlider = async (data: SliderFormData) => {
  const response = await api.post('website-admin/sliders', toSnakeCase(data))
  return response.data
}

export const updateSlider = async (id: number, data: Partial<SliderFormData>) => {
  const response = await api.put(`website-admin/sliders/${id}`, toSnakeCase(data))
  return response.data
}

export const deleteSlider = async (id: number) => {
  const response = await api.delete(`website-admin/sliders/${id}`)
  return response.data
}

export const reorderSliders = async (items: Array<{ id: number; sortOrder: number }>) => {
  const snakeItems = items.map((item) => ({ id: item.id, sort_order: item.sortOrder }))
  const response = await api.post('website-admin/sliders/reorder', { items: snakeItems })
  return response.data
}
