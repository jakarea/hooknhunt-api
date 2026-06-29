import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Coupon, CouponFormData } from '@/utils/api'
import { getCoupon, createCoupon, updateCoupon, deleteCoupon } from '@/utils/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CouponFormState {
  // Form state
  mode: 'create' | 'edit'
  couponId: number | null
  formData: CouponFormData
  loading: boolean
  submitting: boolean
  errors: Record<string, string>

  // Original coupon data (for edit mode)
  originalCoupon: Coupon | null

  // Actions
  setMode: (mode: 'create' | 'edit') => void
  setCouponId: (id: number | null) => void
  setFormData: (data: Partial<CouponFormData>) => void
  setField: <K extends keyof CouponFormData>(field: K, value: CouponFormData[K]) => void
  setLoading: (loading: boolean) => void
  setSubmitting: (submitting: boolean) => void
  setErrors: (errors: Record<string, string>) => void
  clearError: (field: string) => void
  clearAllErrors: () => void
  resetForm: () => void

  // CRUD operations
  loadCoupon: (id: number) => Promise<void>
  submitForm: () => Promise<boolean>
  deleteCoupon: (id: number) => Promise<boolean>
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const INITIAL_FORM_DATA: CouponFormData = {
  code: '',
  description: '',
  type: 'percentage',
  amount: 0,
  maxDiscountAmount: null,
  minOrderAmount: null,
  startsAt: null,
  expiresAt: null,
  maxUses: null,
  usageLimitPerCustomer: 1,
  isActive: true,
  isAutoApply: false,
  firstPurchaseOnly: false,
  productIds: null,
  categoryIds: null,
  customerIds: null,
}

// ---------------------------------------------------------------------------
// Pure Functions - Validation
// ---------------------------------------------------------------------------
export const validateCouponForm = (formData: CouponFormData): Record<string, string> => {
  const errors: Record<string, string> = {}

  // Code validation
  if (!formData.code?.trim()) {
    errors.code = 'validation.codeRequired'
  } else if (formData.code.length < 3) {
    errors.code = 'validation.codeMinLength'
  } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
    errors.code = 'validation.codeInvalid'
  }

  // Amount validation
  if (!formData.amount || formData.amount <= 0) {
    errors.amount = 'validation.amountPositive'
  }

  // Type-specific validation
  if (formData.type === 'percentage') {
    if (formData.amount > 100) {
      errors.amount = 'validation.percentageMax'
    }
  }

  // Date validation
  if (formData.startsAt && formData.expiresAt) {
    const startDate = new Date(formData.startsAt)
    const endDate = new Date(formData.expiresAt)
    if (startDate >= endDate) {
      errors.expiresAt = 'validation.expiryAfterStart'
    }
  }

  // Usage limits validation
  if (formData.maxUses !== null && formData.maxUses < 1) {
    errors.maxUses = 'validation.maxUsesMin'
  }

  if (formData.usageLimitPerCustomer !== null && formData.usageLimitPerCustomer < 1) {
    errors.usageLimitPerCustomer = 'validation.usageLimitPerCustomerMin'
  }

  // Min order amount validation
  if (formData.minOrderAmount !== null && formData.minOrderAmount < 0) {
    errors.minOrderAmount = 'validation.minOrderAmountNegative'
  }

  // Max discount amount validation
  if (formData.maxDiscountAmount !== null && formData.maxDiscountAmount < 0) {
    errors.maxDiscountAmount = 'validation.maxDiscountAmountNegative'
  }

  return errors
}

// ---------------------------------------------------------------------------
// Pure Functions - Data Transformation
// ---------------------------------------------------------------------------
export const couponToFormData = (coupon: Coupon): CouponFormData => ({
  code: coupon.code,
  description: coupon.description ?? '',
  type: coupon.type,
  amount: coupon.amount,
  maxDiscountAmount: coupon.maxDiscountAmount ?? null,
  minOrderAmount: coupon.minOrderAmount ?? null,
  startsAt: coupon.startsAt ?? null,
  expiresAt: coupon.expiresAt ?? null,
  maxUses: coupon.maxUses ?? null,
  usageLimitPerCustomer: coupon.usageLimitPerCustomer ?? 1,
  isActive: coupon.isActive,
  isAutoApply: coupon.isAutoApply,
  firstPurchaseOnly: coupon.firstPurchaseOnly,
  productIds: coupon.productIds ?? null,
  categoryIds: coupon.categoryIds ?? null,
  customerIds: coupon.customerIds ?? null,
})

export const prepareFormDataForAPI = (formData: CouponFormData): Record<string, unknown> => ({
  code: formData.code.toUpperCase(),
  description: formData.description || null,
  type: formData.type,
  amount: formData.amount,
  max_discount_amount: formData.maxDiscountAmount,
  min_order_amount: formData.minOrderAmount,
  starts_at: formData.startsAt,
  expires_at: formData.expiresAt,
  max_uses: formData.maxUses,
  usage_limit_per_customer: formData.usageLimitPerCustomer,
  is_active: formData.isActive ?? true,
  is_auto_apply: formData.isAutoApply ?? false,
  first_purchase_only: formData.firstPurchaseOnly ?? false,
  product_ids: formData.productIds,
  category_ids: formData.categoryIds,
  customer_ids: formData.customerIds,
})

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useCouponFormStore = create<CouponFormState>()(
  devtools(
    (set, get) => ({
      // Initial state
      mode: 'create',
      couponId: null,
      formData: INITIAL_FORM_DATA,
      loading: false,
      submitting: false,
      errors: {},
      originalCoupon: null,

      // Mode setters
      setMode: (mode) => set({ mode }),
      setCouponId: (id) => set({ couponId: id }),

      // Form data setters
      setFormData: (data) => set((state) => ({
        formData: { ...state.formData, ...data }
      })),

      setField: (field, value) => set((state) => ({
        formData: { ...state.formData, [field]: value }
      })),

      setLoading: (loading) => set({ loading }),
      setSubmitting: (submitting) => set({ submitting }),
      setErrors: (errors) => set({ errors }),

      clearError: (field) => set((state) => {
        const newErrors = { ...state.errors }
        delete newErrors[field]
        return { errors: newErrors }
      }),

      clearAllErrors: () => set({ errors: {} }),

      resetForm: () => set({
        formData: INITIAL_FORM_DATA,
        errors: {},
        originalCoupon: null,
        couponId: null,
        mode: 'create',
      }),

      // Load coupon for editing
      loadCoupon: async (id) => {
        set({ loading: true, errors: {} })
        try {
          const response = await getCoupon(id)
          const coupon = response.data ?? response

          const formData = couponToFormData(coupon)

          set({
            mode: 'edit',
            couponId: id,
            formData,
            originalCoupon: coupon,
            loading: false,
          })
        } catch (error: any) {
          set({ loading: false })
          throw error
        }
      },

      // Submit form (create or update)
      submitForm: async () => {
        const state = get()

        // Validate
        const errors = validateCouponForm(state.formData)
        if (Object.keys(errors).length > 0) {
          set({ errors })
          return false
        }

        set({ submitting: true, errors: {} })

        try {
          if (state.mode === 'create') {
            await createCoupon(state.formData)
          } else if (state.couponId) {
            await updateCoupon(state.couponId, state.formData)
          }

          set({ submitting: false })
          return true
        } catch (error: any) {
          set({ submitting: false })

          // Handle server validation errors
          if (error.response?.status === 422 && error.response?.data?.errors) {
            const serverErrors = error.response.data.errors
            const formattedErrors: Record<string, string> = {}
            Object.keys(serverErrors).forEach(field => {
              formattedErrors[field] = serverErrors[field]?.[0] || 'Validation error'
            })
            set({ errors: formattedErrors })
          }

          throw error
        }
      },

      // Delete coupon
      deleteCoupon: async (id) => {
        try {
          await deleteCoupon(id)
          return true
        } catch (error) {
          throw error
        }
      },
    }),
    { name: 'CouponFormStore' }
  )
)
