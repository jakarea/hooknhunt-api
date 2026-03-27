/**
 * Supplier form utilities with Zod validation.
 *
 * Provides helper functions for supplier form validation
 * that can be easily integrated into existing forms.
 */

import { z } from 'zod'
import { notifications } from '@mantine/notifications'
import { createSupplierSchema, updateSupplierSchema, formatZodErrors, getFirstZodError } from '@/schemas/supplier'
import { transformFormDataToApi, transformValidationErrors, transformApiErrorToMessage } from '@/utils/supplierTransformers'
import type { SupplierFormData } from '@/types/supplier'

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates supplier form data using Zod schema.
 *
 * @param formData - Form data to validate
 * @param isUpdate - Whether this is an update operation (default: false)
 * @returns Object with isValid flag and errors object
 */
export const validateSupplierForm = (
  formData: Partial<SupplierFormData>,
  isUpdate: boolean = false
): { isValid: boolean; errors: Record<string, string> } => {
  const schema = isUpdate ? updateSupplierSchema : createSupplierSchema

  // Clean form data: Convert empty strings to null for optional fields
  // Also convert isActive from number (0/1) to boolean
  const cleanedData = Object.entries(formData).reduce((acc, [key, value]) => {
    if (key === 'isActive') {
      // Convert isActive: number (0/1) → boolean
      acc[key] = value === 1 || value === '1' || value === true
    } else if (isUpdate && value === '') {
      // For update mode, convert empty strings to null
      acc[key] = null
    } else {
      acc[key] = value
    }
    return acc
  }, {} as any)

  // ✅ Use safeParse() instead of parse() - doesn't throw, returns result object
  const result = schema.safeParse(cleanedData)

  console.log('🔍 SafeParse result:', {
    success: result.success,
    hasError: !!result.error,
    errorType: result.error?.constructor?.name,
    error: result.error
  })

  if (result.success) {
    return { isValid: true, errors: {} }
  }

  // Validation failed - format the errors from the ZodError
  console.log('🔍 About to call formatZodErrors with:', result.error)
  const formattedErrors = formatZodErrors(result.error)
  console.log('✅ Formatted validation errors:', formattedErrors)

  return {
    isValid: false,
    errors: formattedErrors,
  }
}

/**
 * Validates a single field from supplier form.
 *
 * @param field - Field name
 * @param value - Field value
 * @returns Object with isValid flag and error message (if any)
 */
export const validateSupplierField = (
  field: string,
  value: any
): { isValid: boolean; error?: string } => {
  try {
    // Create a schema with just this field
    const fieldSchema = z.object({
      [field]: createSupplierSchema.shape[field as string]
    })

    fieldSchema.parse({ [field]: value })

    return { isValid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: getFirstZodError(error),
      }
    }
    return { isValid: false, error: 'Validation failed' }
  }
}

/**
 * Shows validation errors as notifications.
 *
 * @param errors - Validation errors object
 */
export const showValidationErrors = (errors: Record<string, string>): void => {
  Object.entries(errors).forEach(([field, message]) => {
    notifications.show({
      title: 'Validation Error',
      message: `${field}: ${message}`,
      color: 'red',
    })
  })
}

/**
 * Handles API validation errors from backend.
 *
 * @param error - Error object from API response
 * @returns Formatted errors object
 */
export const handleApiValidationErrors = (error: any): Record<string, string> => {
  return transformValidationErrors(error)
}

/**
 * Transform frontend form data (camelCase) to backend format (snake_case).
 *
 * @param formData - Form data from frontend
 * @returns FormData object for API submission
 */
export const transformToApiFormat = (formData: SupplierFormData): FormData => {
  return transformFormDataToApi(formData)
}

/**
 * Get user-friendly error message from API error.
 *
 * @param error - Error object from API
 * @returns User-friendly error message
 */
export const getErrorMessage = (error: any): string => {
  return transformApiErrorToMessage(error)
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type { SupplierFormData }
