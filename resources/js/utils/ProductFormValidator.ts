/**
 * Frontend pure function utilities for product form validation
 * Mirrors backend ProductFormValidator.php logic
 * Used in both CREATE and EDIT pages
 */

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string>
}

/**
 * Validate complete product form
 * Pure function: data → {valid, errors}
 *
 * @param data Form data to validate
 * @returns Validation result with errors
 */
export function validateProductForm(data: any): ValidationResult {
  const errors: Record<string, string> = {}

  // Required: Product Name
  if (!data.productName || (data.productName as string).trim() === '') {
    errors.productName = 'Product name is required'
  }

  // Required: Category
  if (!data.category) {
    errors.category = 'Please select a category'
  }

  // Required: Brand
  if (!data.brand) {
    errors.brand = 'Please select a brand'
  }

  // Required: Description (min 10 chars)
  if (!data.description) {
    errors.description = 'Description is required'
  } else if ((data.description as string).trim().length < 10) {
    errors.description = 'Description must be at least 10 characters'
  }

  // Required: At least one variant
  if (!data.variants || !Array.isArray(data.variants) || data.variants.length === 0) {
    errors.variants = 'At least one variant is required'
  } else {
    // Validate each variant
    data.variants.forEach((variant: any, index: number) => {
      const variantErrors = validateVariant(variant, index)
      Object.assign(errors, variantErrors)
    })
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * Validate single variant
 * Returns errors keyed as "variant.{index}.{field}"
 *
 * @param variant Variant data
 * @param index Variant index (0-based)
 * @returns Validation errors for this variant
 */
function validateVariant(variant: any, index: number): Record<string, string> {
  const errors: Record<string, string> = {}
  const prefix = `variant.${index}`
  const variantNumber = index + 1

  // Variant Name (required)
  if (!variant.name || (variant.name as string).trim() === '') {
    errors[`${prefix}.name`] = `Variant ${variantNumber} name is required`
  }

  // Seller SKU (required)
  if (!variant.sellerSku && !variant.sku) {
    errors[`${prefix}.sellerSku`] = `Variant ${variantNumber} SKU is required`
  }

  // Purchase Cost (required, must be number, >= 0)
  if (
    variant.purchaseCost === null ||
    variant.purchaseCost === '' ||
    variant.purchaseCost === undefined
  ) {
    errors[`${prefix}.purchaseCost`] = `Variant ${variantNumber} purchase cost is required`
  } else if (isNaN(Number(variant.purchaseCost))) {
    errors[`${prefix}.purchaseCost`] = `Variant ${variantNumber} purchase cost must be a number`
  } else if (Number(variant.purchaseCost) < 0) {
    errors[`${prefix}.purchaseCost`] = `Variant ${variantNumber} purchase cost cannot be negative`
  }

  // Retail Price / Price (required, must be number, >= 0)
  const price = variant.price ?? variant.retailPrice
  if (price === null || price === '' || price === undefined) {
    errors[`${prefix}.price`] = `Variant ${variantNumber} retail price is required`
  } else if (isNaN(Number(price))) {
    errors[`${prefix}.price`] = `Variant ${variantNumber} retail price must be a number`
  } else if (Number(price) < 0) {
    errors[`${prefix}.price`] = `Variant ${variantNumber} retail price cannot be negative`
  }

  // Stock (required, must be integer, >= 0)
  if (variant.stock === null || variant.stock === '' || variant.stock === undefined) {
    errors[`${prefix}.stock`] = `Variant ${variantNumber} stock is required`
  } else if (isNaN(Number(variant.stock))) {
    errors[`${prefix}.stock`] = `Variant ${variantNumber} stock must be a number`
  } else if (Number(variant.stock) < 0) {
    errors[`${prefix}.stock`] = `Variant ${variantNumber} stock cannot be negative`
  }

  return errors
}

/**
 * Validate variant data only (for individual variant updates)
 *
 * @param variant Variant data
 * @returns Validation errors
 */
export function validateVariantOnly(variant: any): Record<string, string> {
  return validateVariant(variant, 0)
}
