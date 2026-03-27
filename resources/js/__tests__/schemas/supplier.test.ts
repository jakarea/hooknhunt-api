/**
 * Zod validation tests for Supplier schemas.
 *
 * Run with: npm test
 */

import { describe, it, expect } from '@jest/globals'
import { z } from 'zod'
import {
  createSupplierSchema,
  updateSupplierSchema,
  supplierSearchSchema,
  formatZodErrors,
  getFirstZodError,
  type CreateSupplierInput,
  type UpdateSupplierInput,
} from '@/schemas/supplier'

describe('Supplier Zod Schemas', () => {
  // ==========================================================================
  // createSupplierSchema Tests
  // ==========================================================================

  describe('createSupplierSchema', () => {
    it('should validate valid supplier data', () => {
      const validData = {
        name: 'Test Supplier',
        email: 'test@example.com',
        phone: '1234567890',
        whatsapp: '9876543210',
        shopName: 'Test Shop',
        shopUrl: 'https://example.com',
        contactPerson: 'John Doe',
        wechatId: 'wechat123',
        wechatQrUrl: 'https://wechat.example.com',
        alipayId: 'alipay123',
        alipayQrUrl: 'https://alipay.example.com',
        address: '123 Test Street',
        isActive: true,
      }

      const result = createSupplierSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Supplier')
        expect(result.data.email).toBe('test@example.com')
      }
    })

    it('should fail validation for missing name', () => {
      const invalidData = {
        email: 'test@example.com',
      }

      const result = createSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('required')
      }
    })

    it('should fail validation for missing email', () => {
      const invalidData = {
        name: 'Test Supplier',
      }

      const result = createSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('required')
      }
    })

    it('should fail validation for invalid email format', () => {
      const invalidData = {
        name: 'Test Supplier',
        email: 'not-an-email',
      }

      const result = createSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('email')
      }
    })

    it('should fail validation for name exceeding max length', () => {
      const invalidData = {
        name: 'a'.repeat(256), // 256 characters, max is 255
        email: 'test@example.com',
      }

      const result = createSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('255')
      }
    })

    it('should accept null for optional fields', () => {
      const validData = {
        name: 'Test Supplier',
        email: 'test@example.com',
        phone: null,
        whatsapp: null,
        shopName: null,
        shopUrl: null,
        contactPerson: null,
        wechatId: null,
        wechatQrUrl: null,
        alipayId: null,
        alipayQrUrl: null,
        address: null,
        isActive: null,
      }

      const result = createSupplierSchema.safeParse(validData)

      expect(result.success).toBe(true)
    })
  })

  // ==========================================================================
  // updateSupplierSchema Tests
  // ==========================================================================

  describe('updateSupplierSchema', () => {
    it('should validate valid update data', () => {
      const validData = {
        name: 'Updated Supplier',
        email: 'updated@example.com',
      }

      const result = updateSupplierSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Supplier')
      }
    })

    it('should accept empty update (all fields optional)', () => {
      const result = updateSupplierSchema.safeParse({})

      expect(result.success).toBe(true)
    })

    it('should fail validation for invalid email when provided', () => {
      const invalidData = {
        email: 'not-an-email',
      }

      const result = updateSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('email')
      }
    })

    it('should fail validation for invalid URL', () => {
      const invalidData = {
        shopUrl: 'not-a-url',
      }

      const result = updateSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain('URL')
      }
    })
  })

  // ==========================================================================
  // supplierSearchSchema Tests
  // ==========================================================================

  describe('supplierSearchSchema', () => {
    it('should validate valid search parameters', () => {
      const validData = {
        search: 'test',
        isActive: true,
        page: 1,
        perPage: 15,
      }

      const result = supplierSearchSchema.safeParse(validData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('test')
        expect(result.data.page).toBe(1)
        expect(result.data.perPage).toBe(15)
      }
    })

    it('should accept empty search parameters', () => {
      const result = supplierSearchSchema.safeParse({})

      expect(result.success).toBe(true)
    })

    it('should fail validation for negative page number', () => {
      const invalidData = {
        page: -1,
      }

      const result = supplierSearchSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })

    it('should fail validation for zero page number', () => {
      const invalidData = {
        page: 0,
      }

      const result = supplierSearchSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
    })
  })

  // ==========================================================================
  // Utility Functions Tests
  // ==========================================================================

  describe('formatZodErrors', () => {
    it('should format Zod errors correctly', () => {
      const invalidData = {
        name: '', // Empty name
        email: 'bad-email', // Bad email
      }

      const result = createSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        const errors = formatZodErrors(result.error)

        expect(Object.keys(errors)).toHaveLength(2)
        expect(errors.name).toBeDefined()
        expect(errors.email).toBeDefined()
      }
    })
  })

  describe('getFirstZodError', () => {
    it('should return first error message', () => {
      const invalidData = {
        name: '', // Empty name (first error)
        email: 'bad-email', // Bad email (second error)
      }

      const result = createSupplierSchema.safeParse(invalidData)

      expect(result.success).toBe(false)
      if (!result.success) {
        const firstError = getFirstZodError(result.error)

        expect(firstError).toBeDefined()
        expect(typeof firstError).toBe('string')
      }
    })
  })
})
