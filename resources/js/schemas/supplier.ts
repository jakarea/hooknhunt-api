/**
 * Zod validation schemas for Supplier module.
 *
 * Provides type-safe validation for supplier forms with
 * consistent error messages and type inference.
 */

import { z } from 'zod'

// ============================================================================
// SUPPLIER VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for creating a new supplier.
 *
 * All fields are validated according to backend rules.
 * File uploads are handled separately.
 */
export const createSupplierSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters'),

  email: z.string()
    .min(1, 'Email is required')
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters'),

  phone: z.string()
    .max(20, 'Phone must not exceed 20 characters')
    .optional()
    .nullable(),

  whatsapp: z.string()
    .max(20, 'WhatsApp must not exceed 20 characters')
    .optional()
    .nullable(),

  shopName: z.string()
    .max(255, 'Shop name must not exceed 255 characters')
    .optional()
    .nullable(),

  shopUrl: z.string()
    .max(500, 'Shop URL must not exceed 500 characters')
    .optional()
    .nullable(),

  contactPerson: z.string()
    .max(255, 'Contact person must not exceed 255 characters')
    .optional()
    .nullable(),

  wechatId: z.string()
    .max(100, 'WeChat ID must not exceed 100 characters')
    .optional()
    .nullable(),

  wechatQrUrl: z.string()
    .max(500, 'WeChat QR URL must not exceed 500 characters')
    .optional()
    .nullable(),

  alipayId: z.string()
    .max(100, 'Alipay ID must not exceed 100 characters')
    .optional()
    .nullable(),

  alipayQrUrl: z.string()
    .max(500, 'Alipay QR URL must not exceed 500 characters')
    .optional()
    .nullable(),

  address: z.string()
    .max(500, 'Address must not exceed 500 characters')
    .optional()
    .nullable(),

  isActive: z.boolean().optional().nullable(),
})

// ============================================================================
// SUPPLIER UPDATE SCHEMA
// ============================================================================

/**
 * Schema for updating an existing supplier.
 *
 * All fields are optional for partial updates.
 * File uploads are handled separately.
 */
export const updateSupplierSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must not exceed 255 characters')
    .optional()
    .nullable(),

  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must not exceed 255 characters')
    .optional()
    .nullable(),

  phone: z.string()
    .max(20, 'Phone must not exceed 20 characters')
    .optional()
    .nullable(),

  whatsapp: z.string()
    .max(20, 'WhatsApp must not exceed 20 characters')
    .optional()
    .nullable(),

  shopName: z.string()
    .max(255, 'Shop name must not exceed 255 characters')
    .optional()
    .nullable(),

  shopUrl: z.string()
    .max(500, 'Shop URL must not exceed 500 characters')
    .optional()
    .nullable(),

  contactPerson: z.string()
    .max(255, 'Contact person must not exceed 255 characters')
    .optional()
    .nullable(),

  wechatId: z.string()
    .max(100, 'WeChat ID must not exceed 100 characters')
    .optional()
    .nullable(),

  wechatQrUrl: z.string()
    .max(500, 'WeChat QR URL must not exceed 500 characters')
    .optional()
    .nullable(),

  alipayId: z.string()
    .max(100, 'Alipay ID must not exceed 100 characters')
    .optional()
    .nullable(),

  alipayQrUrl: z.string()
    .max(500, 'Alipay QR URL must not exceed 500 characters')
    .optional()
    .nullable(),

  address: z.string()
    .max(500, 'Address must not exceed 500 characters')
    .optional()
    .nullable(),

  isActive: z.boolean().optional().nullable(),
})

// ============================================================================
// SEARCH/QUERY SCHEMAS
// ============================================================================

/**
 * Schema for supplier search parameters.
 */
export const supplierSearchSchema = z.object({
  search: z.string().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  page: z.number().int().positive().optional().nullable(),
  perPage: z.number().int().positive().optional().nullable(),
})

// ============================================================================
// TYPE EXPORTS
// ============================================================================

/**
 * Type inference from schemas for TypeScript usage.
 */
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type SupplierSearchInput = z.infer<typeof supplierSearchSchema>

// ============================================================================
// ERROR MESSAGE UTILITIES
// ============================================================================

/**
 * Formats Zod error messages for display.
 *
 * @param error - Zod error object from safeParse()
 * @returns Object mapping field names to error messages
 */
export const formatZodErrors = (error: z.ZodError): Record<string, string> => {
  const errors: Record<string, string> = {}

  console.log('🔍 formatZodErrors received:', {
    error,
    errorKeys: Object.keys(error || {}),
    hasErrors: !!error?.errors,
    errorsType: typeof error?.errors,
    errorsIsArray: Array.isArray(error?.errors),
    hasIssues: !!error?.issues,
    issuesType: typeof error?.issues,
    issuesIsArray: Array.isArray(error?.issues),
    issuesLength: error?.issues?.length
  })

  // Try to get errors from different possible properties
  const errorList = error.issues || error.errors || error.errorList || []

  console.log('🔍 Using error list:', errorList)

  if (!Array.isArray(errorList) || errorList.length === 0) {
    console.error('❌ No error array found on ZodError object')
    return { general: 'Validation error: Please check your input' }
  }

  // Map each error to its field name
  errorList.forEach((err: any, index: number) => {
    console.log(`🔍 Processing error ${index}:`, err)
    // Use first path element as field name (e.g., "email" from ["email"])
    const field = err.path && err.path.length > 0 ? String(err.path[0]) : 'general'
    errors[field] = err.message
  })

  console.log('✅ Final formatted errors:', errors)
  return errors
}

/**
 * Gets the first error message from a Zod error.
 *
 * @param error - Zod error object
 * @returns First error message or default message
 */
export const getFirstZodError = (error: z.ZodError): string => {
  return error.errors[0]?.message || 'Validation failed'
}
