/**
 * Frontend pure function utilities for SKU generation
 * Mirrors backend SKUGenerator.php logic
 * Used in both CREATE and EDIT pages
 */

/**
 * Generate SKU from variant name
 * Pure function: name → sku
 *
 * Rules:
 * - Lowercase
 * - Replace spaces with hyphens
 * - Remove special characters
 * - Collapse multiple hyphens
 * - Trim hyphens from ends
 * - Fallback to timestamp if empty
 */
export function generateSkuFromVariantName(variantName: string | null | undefined): string {
  if (!variantName || variantName.trim() === '') {
    return `variant-${Date.now()}`
  }

  let sku = variantName.toLowerCase().trim()
  sku = sku.replace(/\s+/g, '-')           // spaces → hyphens
  sku = sku.replace(/[^a-z0-9-]/g, '')     // remove special chars
  sku = sku.replace(/-+/g, '-')            // collapse multiple hyphens
  sku = sku.replace(/^-+|-+$/g, '')        // trim hyphens from ends

  return sku || `variant-${Date.now()}`
}

/**
 * Generate SKU for new variant during create
 * Uses manual SKU if provided, otherwise auto-generates from name
 *
 * @param defaultName - Default variant name from form
 * @param manualSku - Manual SKU if user provided one
 * @returns Generated or manual SKU
 */
export function generateSkuForNewVariant(
  defaultName: string | null | undefined,
  manualSku: string | null | undefined
): string {
  // If manual SKU provided, use it
  if (manualSku && manualSku.trim() !== '') {
    return manualSku.trim()
  }

  // Auto-generate from name
  return generateSkuFromVariantName(defaultName)
}

/**
 * Validate SKU format
 * Pure function: sku → valid bool
 */
export function isValidSKU(sku: string | null | undefined): boolean {
  if (!sku || sku.trim() === '') {
    return false
  }

  // SKU should only have alphanumeric and hyphens
  return /^[a-z0-9-]+$/.test(sku.toLowerCase().trim())
}
