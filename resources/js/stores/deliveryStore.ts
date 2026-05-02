import { create } from 'zustand'
import { api } from '@/lib/api'

// ============================================
// TYPES
// ============================================

export interface DeliverySettings {
  base_weight: number
  inside_dhaka: {
    base_charge: number
    per_kg_charge: number
  }
  outside_dhaka: {
    base_charge: number
    per_kg_charge: number
  }
  flat_rate: {
    enabled: boolean
    base_charge: number
    per_kg_charge: number
  }
  free_delivery: {
    enabled: boolean
    min_amount: number
  }
  progressive_delivery: {
    enabled: boolean
    min_amount: number
    mode?: 'linear' | 'tiered'
  }
}

export interface ProgressiveDeliveryInfo {
  enabled: boolean
  order_amount?: number
  min_amount?: number
  discount_percentage?: number
  discount_amount?: number
  amount_needed_for_free?: number
  is_free?: boolean
}

export interface DeliveryBreakdown {
  total_weight: number
  base_weight: number
  zone: 'inside_dhaka' | 'outside_dhaka' | 'flat_rate'
  is_inside_dhaka: boolean
  is_flat_rate: boolean
  base_charge: number
  additional_kg: number
  per_kg_rate: number
  total_charge: number
  free_delivery: boolean
  progressive_delivery: ProgressiveDeliveryInfo
}

export interface DeliveryCalculationParams {
  weight: number
  division: string
  order_amount?: number
}

export interface DeliveryCalculationResult {
  charge: number
  breakdown: DeliveryBreakdown
}

// ============================================
// STORE STATE & ACTIONS
// ============================================

interface DeliveryState {
  settings: DeliverySettings | null
  loading: boolean
  error: string | null

  // Actions
  fetchDeliverySettings: () => Promise<void>
  calculateDelivery: (params: DeliveryCalculationParams) => Promise<DeliveryCalculationResult>
  clearError: () => void
}

// ============================================
// STORE
// ============================================

export const useDeliveryStore = create<DeliveryState>((set, get) => ({
  settings: null,
  loading: false,
  error: null,

  fetchDeliverySettings: async () => {
    try {
      set({ loading: true, error: null })

      const response = await api.get('website-admin/delivery-settings')

      if (response.data.success) {
        set({ settings: response.data.data, loading: false })
      } else {
        set({
          error: response.data.message || 'Failed to fetch delivery settings',
          loading: false,
        })
      }
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch delivery settings',
        loading: false,
      })
    }
  },

  calculateDelivery: async (params) => {
    try {
      const response = await api.post('website-admin/delivery-settings/calculate', {
        weight: params.weight,
        division: params.division,
        order_amount: params.order_amount,
      })

      if (response.data.success) {
        return response.data.data
      }

      throw new Error(response.data.message || 'Failed to calculate delivery')
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to calculate delivery')
    }
  },

  clearError: () => set({ error: null }),
}))

// ============================================
// HELPERS
// ============================================

/**
 * Calculate progressive discount percentage client-side (for preview)
 */
export const calculateProgressiveDiscount = (
  orderAmount: number,
  minAmount: number
): number => {
  if (minAmount <= 0 || orderAmount <= 0) {
    return 0
  }

  const percentage = (orderAmount / minAmount) * 100
  return Math.min(100, Math.max(0, percentage))
}

/**
 * Format currency for display
 */
export const formatDeliveryCharge = (amount: number): string => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Get zone display name
 */
export const getZoneDisplayName = (zone: string): string => {
  const zoneNames: Record<string, string> = {
    inside_dhaka: 'Inside Dhaka',
    outside_dhaka: 'Outside Dhaka',
    flat_rate: 'Flat Rate',
  }
  return zoneNames[zone] || zone
}
