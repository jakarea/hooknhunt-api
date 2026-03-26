import { notifications } from '@mantine/notifications'
import api from '@/lib/api'
import { usePurchaseOrderDetailStore } from '@/stores/purchaseOrderDetailStore'

/**
 * Types for timeline edit functionality
 */
export interface TimelineEditData {
  // Comments
  comments: string

  // Payment confirmed
  exchangeRate: number

  // Supplier dispatched
  courierName: string
  trackingNumber: string

  // Warehouse received
  lotNumber: string

  // Shipped BD
  transportType: string
  totalWeight: number
  shippingCostPerKg: number

  // Arrived BD
  bdCourierTracking: string
}

export interface StatusHistoryEntry {
  id: number
  oldStatus?: string
  newStatus: string
  comments?: string
  createdAt: string
  changedByUser?: {
    id: number
    name: string
  }
  timelineData?: {
    exchange_rate?: number
    courier_name?: string
    tracking_number?: string
    lot_number?: string
    transport_type?: string
    total_weight?: number
    shipping_cost_per_kg?: number
    total_shipping_cost?: number
    bd_courier_tracking?: string
  }
}

/**
 * Get initial form data based on status and order data
 * @param statusValue - The status value being edited
 * @param order - The purchase order object
 * @param historyEntry - Optional status history entry with timeline data
 * @returns Initial timeline edit data
 */
export const getInitialTimelineData = (
  statusValue: string,
  order: any,
  historyEntry?: StatusHistoryEntry
): TimelineEditData => {
  // Get timeline data from history entry first, fall back to order data
  const timeline = historyEntry?.timelineData || {}

  // For shipped_bd status, get shipping_cost_per_kg from timeline data or from the first item
  // since it's now stored at item level, not order level
  let shippingCostPerKg = 0
  if (statusValue === 'shipped_bd') {
    if (timeline.shipping_cost_per_kg !== undefined) {
      shippingCostPerKg = Number(timeline.shipping_cost_per_kg) || 0
    } else if (order?.items?.length > 0) {
      shippingCostPerKg = Number(order.items[0].shippingCostPerKg) || 0
    }
  }

  return {
    comments: historyEntry?.comments || '',
    exchangeRate: timeline.exchange_rate !== undefined ? Number(timeline.exchange_rate) : (Number(order?.exchangeRate) || 0),
    courierName: timeline.courier_name || order?.courierName || '',
    trackingNumber: timeline.tracking_number || order?.trackingNumber || '',
    lotNumber: timeline.lot_number || order?.lotNumber || '',
    transportType: timeline.transport_type || order?.shippingMethod || '',
    totalWeight: timeline.total_weight !== undefined ? Number(timeline.total_weight) : (Number(order?.totalWeight) || 0),
    shippingCostPerKg: shippingCostPerKg,
    bdCourierTracking: timeline.bd_courier_tracking || order?.bdCourierTracking || '',
  }
}

/**
 * Get editable fields for a specific status
 * @param statusValue - The status value
 * @returns Array of field names that can be edited for this status
 */
export const getEditableFieldsForStatus = (statusValue: string): (keyof TimelineEditData)[] => {
  const editableFields: Record<string, (keyof TimelineEditData)[]> = {
    payment_confirmed: ['exchangeRate', 'comments'],
    supplier_dispatched: ['courierName', 'trackingNumber', 'comments'],
    warehouse_received: ['lotNumber', 'comments'],
    shipped_bd: ['transportType', 'totalWeight', 'shippingCostPerKg', 'comments'],
    arrived_bd: ['bdCourierTracking', 'comments'],
    in_transit_bogura: ['bdCourierTracking', 'comments'],
  }

  return editableFields[statusValue] || ['comments']
}

/**
 * Build API payload for timeline data update
 * @param statusValue - The status being updated
 * @param formData - The form data
 * @returns API payload object
 */
export const buildTimelineUpdatePayload = (
  statusValue: string,
  formData: TimelineEditData
): Record<string, any> => {
  const payload: Record<string, any> = {}

  switch (statusValue) {
    case 'payment_confirmed':
      if (formData.exchangeRate > 0) {
        payload.exchange_rate = formData.exchangeRate
      }
      break

    case 'supplier_dispatched':
      if (formData.courierName) payload.courier_name = formData.courierName
      if (formData.trackingNumber) payload.tracking_number = formData.trackingNumber
      break

    case 'warehouse_received':
      if (formData.lotNumber) payload.lot_number = formData.lotNumber
      break

    case 'shipped_bd':
      if (formData.transportType) payload.transport_type = formData.transportType
      if (formData.totalWeight > 0) payload.total_weight = formData.totalWeight
      // Always send shipping_cost_per_kg if it has a value (including 0)
      if (formData.shippingCostPerKg !== null && formData.shippingCostPerKg !== undefined) {
        payload.shipping_cost_per_kg = formData.shippingCostPerKg
      }
      break

    case 'arrived_bd':
      if (formData.bdCourierTracking) payload.bd_courier_tracking = formData.bdCourierTracking
      break

    case 'in_transit_bogura':
      if (formData.bdCourierTracking) payload.bd_courier_tracking = formData.bdCourierTracking
      break
  }

  return payload
}

/**
 * Validate timeline edit data
 * @param statusValue - The status being validated
 * @param formData - The form data to validate
 * @returns Object with isValid flag and errors array
 */
export const validateTimelineData = (
  statusValue: string,
  formData: TimelineEditData
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  // Payment confirmed requires exchange rate
  if (statusValue === 'payment_confirmed' && formData.exchangeRate <= 0) {
    errors.push('Exchange rate is required')
  }

  // Supplier dispatched requires courier name and tracking
  if (statusValue === 'supplier_dispatched') {
    if (!formData.courierName?.trim()) {
      errors.push('Courier name is required')
    }
    if (!formData.trackingNumber?.trim()) {
      errors.push('Tracking number is required')
    }
  }

  // Warehouse received requires lot number
  if (statusValue === 'warehouse_received' && !formData.lotNumber?.trim()) {
    errors.push('Lot number is required')
  }

  // Shipped BD requires transport type, total weight, and shipping cost
  if (statusValue === 'shipped_bd') {
    if (!formData.transportType?.trim()) {
      errors.push('Transport type is required')
    }
    if (formData.totalWeight <= 0) {
      errors.push('Total weight is required')
    }
    if (formData.shippingCostPerKg < 0) {
      errors.push('Shipping cost per kg cannot be negative')
    }
  }

  // In transit bogura requires BD courier tracking
  if (statusValue === 'in_transit_bogura' && !formData.bdCourierTracking?.trim()) {
    errors.push('BD courier tracking is required')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * Save timeline data update
 * @param orderId - The purchase order ID
 * @param statusValue - The status being updated
 * @param formData - The form data
 * @param historyId - Optional history entry ID for comments update
 * @param t - Translation function
 * @returns Promise with success flag
 */
export const saveTimelineUpdate = async (
  orderId: number,
  statusValue: string,
  formData: TimelineEditData,
  historyId: number | null,
  t: (key: string) => string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Build payload for timeline data
    const payload = buildTimelineUpdatePayload(statusValue, formData)

    // Get the store instance
    const store = usePurchaseOrderDetailStore.getState()

    // For shipped_bd status, we need to update BOTH the order AND the timeline_data
    if (statusValue === 'shipped_bd' && Object.keys(payload).length > 0) {
      // Update the actual purchase order fields
      await api.patch(`procurement/orders/${orderId}`, {
        transport_type: payload.transport_type,
        total_weight: payload.total_weight,
        shipping_cost_per_kg: payload.shipping_cost_per_kg,
      })

      // Also update timeline_data for history
      if (historyId) {
        await api.patch(`procurement/orders/${orderId}/status-history/${historyId}/timeline-data`, {
          timeline_data: payload,
        })
      }

      // Refresh order data to show updated values
      await store.fetchOrder(orderId)
    }
    // For other statuses, only update timeline_data
    else if (historyId && Object.keys(payload).length > 0) {
      const timelineResponse = await api.patch(`procurement/orders/${orderId}/status-history/${historyId}/timeline-data`, {
        timeline_data: payload,
      })

      // Update the store directly with the response
      if (timelineResponse.data?.data) {
        store.updateStatusHistoryEntry(historyId, {
          timelineData: timelineResponse.data.data.timelineData,
        })
      }
    } else if (Object.keys(payload).length > 0) {
      // Fallback: Update order directly for backward compatibility
      const fallbackResponse = await api.patch(`procurement/orders/${orderId}`, payload)
    }

    // Update comments if history ID provided
    if (historyId) {
      const commentsResponse = await api.patch(`procurement/orders/${orderId}/status-history/${historyId}/comments`, {
        comments: formData.comments.trim(),
      })

      // Update the store directly with the new comments
      if (commentsResponse.data?.data) {
        store.updateStatusHistoryEntry(historyId, {
          comments: commentsResponse.data.data.comments,
        })
      }
    }

    notifications.show({
      title: t('common.success'),
      message: t('procurement.ordersPage.notifications.updated'),
      color: 'green',
    })

    return { success: true }
  } catch (error: any) {
    console.error('Failed to update timeline:', error)
    notifications.show({
      title: t('common.error'),
      message: error.response?.data?.message || error.message || t('procurement.ordersPage.notifications.errorUpdating'),
      color: 'red',
    })
    return {
      success: false,
      error: error.response?.data?.message || error.message,
    }
  }
}


/**
 * Check if a status can be edited
 * @param statusValue - The status value
 * @param isCompleted - Whether the order is completed
 * @param isPartiallyCompleted - Whether the order is partially completed
 * @returns True if status can be edited
 */
export const canEditStatus = (
  statusValue: string,
  isCompleted: boolean,
  isPartiallyCompleted: boolean
): boolean => {
  if (isCompleted || isPartiallyCompleted) return false

  const editableStatuses = [
    'payment_confirmed',
    'supplier_dispatched',
    'warehouse_received',
    'shipped_bd',
    'arrived_bd',
    'in_transit_bogura'
  ]
  return editableStatuses.includes(statusValue)
}

/**
 * Get status label from value
 * @param statusValue - The status value
 * @param statusFlow - Array of status objects
 * @returns Status label or the value itself if not found
 */
export const getStatusLabel = (
  statusValue: string,
  statusFlow: Array<{ value: string; label: string; icon: any; color: string }>
): string => {
  const status = statusFlow.find(s => s.value === statusValue)
  return status?.label || statusValue
}

/**
 * Get status color from value
 * @param statusValue - The status value
 * @param statusFlow - Array of status objects
 * @returns Status color or 'gray' if not found
 */
export const getStatusColor = (
  statusValue: string,
  statusFlow: Array<{ value: string; label: string; icon: any; color: string }>
): string => {
  const status = statusFlow.find(s => s.value === statusValue)
  return status?.color || 'gray'
}
