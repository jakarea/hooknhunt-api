/**
 * Frontend pure function utilities for applying default values
 * Implements NEW logic: if (default > 0) → OVERWRITE all
 * OLD logic: if (!v.field) → only fill empty (WRONG - removed)
 * Mirrors backend ApplyDefaults.php logic
 * Used in both CREATE and EDIT pages
 */

/**
 * Apply default values to multiple variants
 * Pure function: variants + defaults → updated variants
 *
 * Rules:
 * - If default value > 0 (or !== undefined for optional fields)
 * - Then OVERWRITE all variants with that value
 * - If default = 0 or empty, skip (don't touch existing values)
 *
 * @param variants Array of variant objects
 * @param defaults Default values to apply
 * @returns Updated variants
 */
export function applyDefaultsToVariants(variants: any[], defaults: any): any[] {
  console.log('🧪 applyDefaultsToVariants called')
  console.log('  Input variants:', variants)
  console.log('  Input defaults:', defaults)

  const result = variants.map((variant) => applyDefaultsToVariant(variant, defaults))

  console.log('  Result variants:', result)
  return result
}

/**
 * Apply defaults to single variant
 * Pure function: variant + defaults → updated variant
 *
 * @param variant Single variant object
 * @param defaults Default values to apply
 * @returns Updated variant
 */
export function applyDefaultsToVariant(variant: any, defaults: any): any {
  const updated = { ...variant }
  let changed = false

  // Text fields: only apply if not empty
  if (defaults.name && String(defaults.name).trim() !== '') {
    updated.name = defaults.name
    changed = true
  }

  // Price fields: only apply if > 0
  if (defaults.purchaseCost > 0) {
    updated.purchaseCost = defaults.purchaseCost
    changed = true
  }

  if (defaults.price > 0) {
    updated.price = defaults.price
    changed = true
  }

  if (defaults.wholesalePrice > 0) {
    updated.wholesalePrice = defaults.wholesalePrice
    changed = true
  }

  if (defaults.specialPrice > 0) {
    updated.specialPrice = defaults.specialPrice
    changed = true
  }

  if (defaults.wholesaleOfferPrice > 0) {
    updated.wholesaleOfferPrice = defaults.wholesaleOfferPrice
    changed = true
  }

  // MOQ: only apply if > 0
  if (defaults.wholesaleMoq > 0) {
    updated.wholesaleMoq = defaults.wholesaleMoq
    changed = true
  }

  // Stock: only apply if > 0
  if (defaults.stock > 0) {
    updated.stock = defaults.stock
    changed = true
  }

  // Weight: only apply if > 0
  if (defaults.weight > 0) {
    updated.weight = defaults.weight
    changed = true
  }

  if (changed) {
    console.log(`✏️ Variant updated:`, { before: variant, after: updated })
  } else {
    console.log(`⊘ Variant skipped (no defaults to apply):`, variant)
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
