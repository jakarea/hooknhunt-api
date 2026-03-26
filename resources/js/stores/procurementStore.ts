import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types
export interface PurchaseOrderStatusPayload {
  exchange_rate?: number
  courier_name?: string
  tracking_number?: string
  lot_number?: string
  bd_courier_tracking?: string
  transport_type?: string
  total_shipping_cost?: number
  total_weight?: number
  shipping_cost_per_kg?: number
  comments?: string
}

export interface StatusTransition {
  from: string
  to: string
  requiredFields: (keyof PurchaseOrderStatusPayload)[]
}

// Status flow configuration (order matters for next/prev)
export const STATUS_FLOW_ORDER = [
  'draft',
  'payment_confirmed',
  'supplier_dispatched',
  'warehouse_received',
  'shipped_bd',
  'arrived_bd',
  'in_transit_bogura',
  'received_hub',
  'partially_completed',
  'completed',
] as const

export type PurchaseOrderStatus = typeof STATUS_FLOW_ORDER[number]

// Valid status transitions and their required fields
export const STATUS_TRANSITIONS: Record<string, StatusTransition[]> = {
  draft: [
    { to: 'payment_confirmed', from: 'draft', requiredFields: ['exchange_rate'] },
  ],
  payment_confirmed: [
    { to: 'supplier_dispatched', from: 'payment_confirmed', requiredFields: ['courier_name', 'tracking_number'] },
  ],
  supplier_dispatched: [
    { to: 'warehouse_received', from: 'supplier_dispatched', requiredFields: [] },
  ],
  warehouse_received: [
    { to: 'shipped_bd', from: 'warehouse_received', requiredFields: ['lot_number'] },
  ],
  shipped_bd: [
    { to: 'arrived_bd', from: 'shipped_bd', requiredFields: ['transport_type', 'total_shipping_cost'] },
  ],
  arrived_bd: [
    { to: 'in_transit_bogura', from: 'arrived_bd', requiredFields: [] },
  ],
  in_transit_bogura: [
    { to: 'received_hub', from: 'in_transit_bogura', requiredFields: [] }, // Opens receiving modal
  ],
  partially_completed: [
    { to: 'completed', from: 'partially_completed', requiredFields: [] }, // Can mark as complete when items found
  ],
}

// Pure validation functions
export const validateStatusTransition = (
  currentStatus: string,
  nextStatus: string
): boolean => {
  const transitions = STATUS_TRANSITIONS[currentStatus]
  if (!transitions) return false
  return transitions.some(t => t.to === nextStatus)
}

export const getRequiredFieldsForTransition = (
  currentStatus: string,
  nextStatus: string
): (keyof PurchaseOrderStatusPayload)[] => {
  const transitions = STATUS_TRANSITIONS[currentStatus]
  if (!transitions) return []
  const transition = transitions.find(t => t.to === nextStatus)
  return transition?.requiredFields || []
}

export const validateRequiredFields = (
  currentStatus: string,
  nextStatus: string,
  payload: PurchaseOrderStatusPayload
): { valid: boolean; missingFields: string[] } => {
  const requiredFields = getRequiredFieldsForTransition(currentStatus, nextStatus)
  const missingFields: string[] = []

  for (const field of requiredFields) {
    const value = payload[field]
    if (value === undefined || value === null || value === '' || (typeof value === 'number' && value <= 0)) {
      missingFields.push(field)
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

export const getNextStatus = (currentStatus: string): PurchaseOrderStatus | null => {
  const currentIndex = STATUS_FLOW_ORDER.indexOf(currentStatus as PurchaseOrderStatus)
  if (currentIndex === -1 || currentIndex === STATUS_FLOW_ORDER.length - 1) return null
  return STATUS_FLOW_ORDER[currentIndex + 1]
}

export const getPreviousStatus = (currentStatus: string): PurchaseOrderStatus | null => {
  const currentIndex = STATUS_FLOW_ORDER.indexOf(currentStatus as PurchaseOrderStatus)
  if (currentIndex <= 0) return null
  return STATUS_FLOW_ORDER[currentIndex - 1]
}

// Store interface
interface ProcurementState {
  // Current order being viewed
  currentOrderId: number | null
  setCurrentOrderId: (id: number | null) => void

  // Status update state
  isUpdating: boolean
  setUpdating: (updating: boolean) => void

  // Modal state
  statusModalOpen: boolean
  setStatusModalOpen: (open: boolean) => void

  // Form data for status transitions
  formData: PurchaseOrderStatusPayload
  setFormData: (data: Partial<PurchaseOrderStatusPayload>) => void
  resetFormData: () => void

  // Actions
  prepareStatusUpdate: (currentStatus: string) => { canProceed: boolean; requiredFields: string[] }
  updateStatus: (
    orderId: number,
    currentStatus: string,
    nextStatus: string,
    apiCall: (id: number, status: string, exchangeRate?: number, payload?: any) => Promise<any>
  ) => Promise<{ success: boolean; error?: string }>

  // Helpers
  clearOrder: () => void
}

// Initial form data
const initialFormData: PurchaseOrderStatusPayload = {}

// Create store
export const useProcurementStore = create<ProcurementState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentOrderId: null,
      isUpdating: false,
      statusModalOpen: false,
      formData: initialFormData,

      // Actions
      setCurrentOrderId: (id) => set({ currentOrderId: id }),

      setUpdating: (updating) => set({ isUpdating: updating }),

      setStatusModalOpen: (open) => set({ statusModalOpen: open }),

      setFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),

      resetFormData: () => set({ formData: initialFormData }),

      prepareStatusUpdate: (currentStatus) => {
        const nextStatus = getNextStatus(currentStatus)
        if (!nextStatus) {
          return { canProceed: false, requiredFields: [] }
        }

        const { missingFields } = validateRequiredFields(
          currentStatus,
          nextStatus,
          get().formData
        )

        return {
          canProceed: missingFields.length === 0,
          requiredFields: missingFields,
        }
      },

      updateStatus: async (orderId, currentStatus, nextStatus, apiCall) => {
        const { formData, setUpdating, resetFormData, setStatusModalOpen } = get()

        // Validate transition
        if (!validateStatusTransition(currentStatus, nextStatus)) {
          return {
            success: false,
            error: `Invalid status transition from ${currentStatus} to ${nextStatus}`,
          }
        }

        // Validate required fields
        const validation = validateRequiredFields(currentStatus, nextStatus, formData)
        if (!validation.valid) {
          return {
            success: false,
            error: `Missing required fields: ${validation.missingFields.join(', ')}`,
          }
        }

        try {
          setUpdating(true)

          // Call API with exchange rate and payload
          const response = await apiCall(
            orderId,
            nextStatus,
            formData.exchange_rate,
            {
              status: nextStatus,
              ...formData,
            }
          )

          resetFormData()
          setStatusModalOpen(false)

          return { success: true }
        } catch (error: any) {
          return {
            success: false,
            error: error.response?.data?.message || error.message || 'Failed to update status',
          }
        } finally {
          setUpdating(false)
        }
      },

      clearOrder: () =>
        set({
          currentOrderId: null,
          formData: initialFormData,
          statusModalOpen: false,
          isUpdating: false,
        }),
    }),
    {
      name: 'procurement-storage',
      // Only persist form data, not modal states
      partialize: (state) => ({
        formData: state.formData,
        currentOrderId: state.currentOrderId,
      }),
    }
  )
)

// Selector hooks for better performance
export const useProcurementFormData = () => useProcurementStore((state) => state.formData)
export const useProcurementIsUpdating = () => useProcurementStore((state) => state.isUpdating)
export const useProcurementStatusModalOpen = () => useProcurementStore((state) => state.statusModalOpen)
