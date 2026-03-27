/**
 * Custom hook for Zod form validation.
 *
 * Provides form validation using Zod schemas with
 * automatic error handling and display.
 */

import { useState, useCallback } from 'react'
import { z } from 'zod'

interface ValidationErrors {
  [key: string]: string
}

interface UseZodValidationProps<T> {
  schema: z.ZodSchema<T>
  initialValues: T
}

interface UseZodValidationReturn<T> {
  values: T
  errors: ValidationErrors
  isValid: boolean
  handleChange: (field: keyof T | string) => (value: any) => void
  handleBlur: (field: keyof T | string) => () => void
  setFieldValue: (field: keyof T | string, value: any) => void
  validate: () => boolean
  validateField: (field: keyof T | string) => boolean
  reset: () => void
  resetErrors: () => void
}

/**
 * Hook for form validation using Zod schemas.
 *
 * @param props - Schema and initial values
 * @returns Form state and validation handlers
 */
export function useZodValidation<T extends Record<string, any>>({
  schema,
  initialValues,
}: UseZodValidationProps<T>): UseZodValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [touched, setTouched] = useState<Set<keyof T>>(new Set())

  /**
   * Calculate if form is currently valid.
   */
  const isValid = Object.keys(errors).length === 0

  /**
   * Handle field value change.
   */
  const handleChange = useCallback((field: keyof T | string) => (value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }))

    // Clear error for this field when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev }
      delete newErrors[field as string]
      return newErrors
    })
  }, [])

  /**
   * Handle field blur (validate individual field).
   */
  const handleBlur = useCallback((field: keyof T | string) => () => {
    validateField(field)
  }, [])

  /**
   * Set a specific field value programmatically.
   */
  const setFieldValue = useCallback((field: keyof T | string, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }))
  }, [])

  /**
   * Validate a single field.
   */
  const validateField = useCallback((field: keyof T | string): boolean => {
    try {
      // Validate only this field
      const fieldSchema = z.object({
        [field as string]: schema.shape[field as string]
      })

      fieldSchema.parse({ [field]: values[field as string] })

      // Clear error if validation passes
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field as string]
        return newErrors
      })

      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatZodErrors(error)
        setErrors((prev) => ({ ...prev, ...formattedErrors }))
      }
      return false
    }
  }, [schema, values])

  /**
   * Validate all form fields.
   */
  const validate = useCallback((): boolean => {
    try {
      schema.parse(values)

      // Clear all errors if validation passes
      setErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = formatZodErrors(error)
        setErrors(formattedErrors)
      }
      return false
    }
  }, [schema, values])

  /**
   * Reset form to initial values.
   */
  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched(new Set())
  }, [initialValues])

  /**
   * Reset only errors (keep values).
   */
  const resetErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    values,
    errors,
    isValid,
    handleChange,
    handleBlur,
    setFieldValue,
    validate,
    validateField,
    reset,
    resetErrors,
  }
}

/**
 * Formats Zod error messages for display.
 */
function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  error.errors.forEach((err) => {
    const field = err.path.join('.')
    errors[field] = err.message
  })

  return errors
}

// ============================================================================
// TYPES
// ============================================================================

export type UseZodValidationReturn<T> = UseZodValidationReturn<T>
