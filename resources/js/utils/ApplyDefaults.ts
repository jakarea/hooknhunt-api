/**
 * Frontend pure function utilities for applying default values
 * Logic: Only apply defaults to EMPTY/ZERO fields
 * If variant field has a value (even 0 or undefined), don't override
 * Mirrors backend ApplyDefaults.php logic
 * Used in both CREATE and EDIT pages
 */

/**
 * Apply default values to multiple variants
 * Pure function: variants + defaults → updated variants
 *
 * Rules:
 * - ONLY apply defaults if the variant field is empty/undefined/zero
 * - DO NOT override if variant field already has a value
 * - This preserves user-entered data while filling in missing fields
 *
 * @param variants Array of variant objects
 * @param defaults Default values to apply
 * @returns Updated variants with defaults applied to empty fields
 */
export function applyDefaultsToVariants(variants: any[], defaults: any): any[] {
  console.log('✅ applyDefaultsToVariants called')
  console.log('  Input variants:', variants.length, 'variants')
  console.log('  Defaults:', defaults)

  const result = variants.map((variant) => applyDefaultsToVariant(variant, defaults))

  console.log('  Result: updated', result.length, 'variants')
  return result
}

/**
 * Apply defaults to single variant
 * Pure function: variant + defaults → updated variant
 *
 * Only fills in empty/zero fields with defaults
 * Preserves any existing user-entered values
 *
 * @param variant Single variant object
 * @param defaults Default values to apply
 * @returns Updated variant with defaults applied to empty fields only
 */
export function applyDefaultsToVariant(variant: any, defaults: any): any {
  const updated = { ...variant }
  let changed = false

  // Text fields: only apply if variant field is empty
  if (defaults.name && String(defaults.name).trim() !== '' && (!updated.name || !String(updated.name).trim())) {
    updated.name = defaults.name
    changed = true
  }

  // Price fields: only apply if variant field is empty/zero/undefined
  if (defaults.purchaseCost && !updated.purchaseCost) {
    updated.purchaseCost = defaults.purchaseCost
    changed = true
  }

  if (defaults.price && !updated.price) {
    updated.price = defaults.price
    changed = true
  }

  if (defaults.wholesalePrice && !updated.wholesalePrice) {
    updated.wholesalePrice = defaults.wholesalePrice
    changed = true
  }

  if ((defaults.specialPrice !== undefined && defaults.specialPrice !== null) && (!updated.specialPrice || updated.specialPrice === 0)) {
    updated.specialPrice = defaults.specialPrice
    changed = true
  }

  if ((defaults.wholesaleOfferPrice !== undefined && defaults.wholesaleOfferPrice !== null) && (!updated.wholesaleOfferPrice || updated.wholesaleOfferPrice === 0)) {
    updated.wholesaleOfferPrice = defaults.wholesaleOfferPrice
    changed = true
  }

  // MOQ: only apply if variant field is empty/zero (defaults to 6)
  if (defaults.wholesaleMoq && !updated.wholesaleMoq) {
    updated.wholesaleMoq = defaults.wholesaleMoq
    changed = true
  }

  // Stock: only apply if variant field is empty/zero
  if (defaults.stock !== undefined && defaults.stock !== null && !updated.stock) {
    updated.stock = defaults.stock
    changed = true
  }

  // Weight: only apply if variant field is empty/zero
  if (defaults.weight !== undefined && defaults.weight !== null && !updated.weight) {
    updated.weight = defaults.weight
    changed = true
  }

  if (changed) {
    console.log(`✏️ Applied defaults to variant:`, variant.name || 'unnamed')
  }

  return updated
}

/**
 * Check if default value should be applied
 * Pure function: default → should apply bool
 *
 * @param value Default value to check
 * @returns True if value should be applied (not 0, not empty, not null)
 */
export function shouldApplyDefault(value: any): boolean {
  if (value === null || value === '' || value === undefined) {
    return false
  }

  if (typeof value === 'number' && value <= 0) {
    return false
  }

  return true
}
