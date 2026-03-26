import { notifications } from '@mantine/notifications'
import { useTranslation } from 'react-i18next'
import type {
  PurchaseOrderStatusPayload,
  PurchaseOrderStatus
} from '@/stores/procurementStore'

// Translation key mappings for validation errors
export const getFieldTranslationKeys = {
  exchange_rate: 'procurement.ordersPage.details.statusUpdate.draft.exchangeRateDescription',
  courier_name: 'procurement.ordersPage.details.statusUpdate.paymentConfirmed.courierName',
  tracking_number: 'procurement.ordersPage.details.statusUpdate.paymentConfirmed.trackingNumber',
  lot_number: 'procurement.ordersPage.details.statusUpdate.warehouseReceived.lotNumber',
  bd_courier_tracking: 'procurement.ordersPage.details.statusUpdate.arrivedBd.bdCourierTracking',
  transport_type: 'procurement.ordersPage.details.statusUpdate.shippedBd.selectTransport',
  total_shipping_cost: 'procurement.ordersPage.details.statusUpdate.shippedBd.shippingCost',
}

// Validate and show error for missing fields
export const validateAndShowErrors = (
  currentStatus: string,
  nextStatus: string,
  payload: PurchaseOrderStatusPayload,
  t: (key: string) => string
): boolean => {
  // Special case: draft → payment_confirmed
  if (currentStatus === 'draft' && nextStatus === 'payment_confirmed') {
    if (!payload.exchange_rate || payload.exchange_rate <= 0) {
      notifications.show({
        title: t('common.error'),
        message: t('procurement.ordersPage.details.statusUpdate.draft.exchangeRateDescription'),
        color: 'red',
      })
      return false
    }
    if (!payload.payment_account_id) {
      notifications.show({
        title: t('common.error'),
        message: 'Please select a payment account',
        color: 'red',
      })
      return false
    }
  }

  // Special case: payment_confirmed → supplier_dispatched
  // Note: courier_name and tracking_number are optional (not required)
  // if (currentStatus === 'payment_confirmed' && nextStatus === 'supplier_dispatched') {
  //   Validation removed - fields are now optional
  // }


  // Special case: warehouse_received → shipped_bd
  // Note: lot_number is optional (not required)
  // if (currentStatus === 'warehouse_received' && nextStatus === 'shipped_bd') {
  //   Validation removed - field is now optional
  // }

  // Special case: arrived_bd → in_transit_bogura
  // BD Courier Tracking is now optional - validation removed
  // if (currentStatus === 'arrived_bd' && nextStatus === 'in_transit_bogura') {
  //   if (!payload.bd_courier_tracking) {
  //     notifications.show({
  //       title: t('common.error'),
  //       message: t('procurement.ordersPage.details.statusUpdate.arrivedBd.bdCourierTracking'),
  //       color: 'red',
  //     })
  //     return false
  //   }
  // }

  // Special case: shipped_bd → arrived_bd
  if (currentStatus === 'shipped_bd' && nextStatus === 'arrived_bd') {
    if (!payload.transport_type) {
      notifications.show({
        title: t('common.error'),
        message: t('procurement.ordersPage.details.statusUpdate.shippedBd.selectTransport'),
        color: 'red',
      })
      return false
    }
    // Validate new shipping fields
    if (!payload.total_weight || payload.total_weight <= 0) {
      notifications.show({
        title: t('common.error'),
        message: 'Please enter total weight in kg',
        color: 'red',
      })
      return false
    }
    if (!payload.shipping_cost_per_kg || payload.shipping_cost_per_kg <= 0) {
      notifications.show({
        title: t('common.error'),
        message: 'Please enter shipping cost per kg',
        color: 'red',
      })
      return false
    }
    // Calculate and validate total shipping cost
    const totalShippingCost = (payload.total_weight || 0) * (payload.shipping_cost_per_kg || 0)
    if (totalShippingCost <= 0) {
      notifications.show({
        title: t('common.error'),
        message: 'Total shipping cost must be greater than 0',
        color: 'red',
      })
      return false
    }
  }

  return true
}

// Build payload for status update
export const buildStatusUpdatePayload = (
  currentStatus: string,
  nextStatus: string,
  formData: PurchaseOrderStatusPayload
): any => {
  const payload: any = {
    status: nextStatus,
  }

  // Add exchange rate and payment account for payment confirmation
  if (currentStatus === 'draft' && nextStatus === 'payment_confirmed') {
    payload.exchange_rate = formData.exchange_rate
    payload.payment_account_id = formData.payment_account_id
  }

  // Add courier details for supplier dispatch
  if (currentStatus === 'payment_confirmed' && nextStatus === 'supplier_dispatched') {
    payload.courier_name = formData.courier_name
    payload.tracking_number = formData.tracking_number
  }

  // Add lot number for shipped to BD
  if (currentStatus === 'warehouse_received' && nextStatus === 'shipped_bd') {
    payload.lot_number = formData.lot_number
  }

  // Add BD tracking for in transit
  if (currentStatus === 'arrived_bd' && nextStatus === 'in_transit_bogura') {
    payload.bd_courier_tracking = formData.bd_courier_tracking
  }

  // Add shipping cost data for arrived BD
  if (currentStatus === 'shipped_bd' && nextStatus === 'arrived_bd') {
    payload.transport_type = formData.transport_type
    payload.total_weight = formData.total_weight
    payload.shipping_cost_per_kg = formData.shipping_cost_per_kg
    // Calculate total shipping cost
    payload.total_shipping_cost = (formData.total_weight || 0) * (formData.shipping_cost_per_kg || 0)
  }

  // Add comments if provided
  if (formData.comments?.trim()) {
    payload.comments = formData.comments.trim()
  }

  return payload
}

// Check if transition requires receiving modal
export const requiresReceivingModal = (currentStatus: string, nextStatus: string): boolean => {
  return currentStatus === 'in_transit_bogura' && nextStatus === 'received_hub'
}

// Show success notification
export const showStatusUpdateSuccess = (
  nextStatusLabel: string,
  message: string,
  t: (key: string) => string
) => {
  notifications.show({
    title: t('common.success'),
    message: message || `Order status updated to "${nextStatusLabel}"`,
    color: 'green',
    autoClose: 5000,
  })
}

// Show error notification
export const showStatusUpdateError = (
  error: any,
  t: (key: string) => string
) => {
  notifications.show({
    title: t('common.error'),
    message: error.response?.data?.message || error.message || t('procurement.ordersPage.notifications.errorUpdating'),
    color: 'red',
  })
}
