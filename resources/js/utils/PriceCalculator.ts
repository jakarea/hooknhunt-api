/**
 * Frontend pure function utilities for price calculations
 * Mirrors backend PriceCalculator.php logic
 * Used in both CREATE and EDIT pages
 */

export interface CalculatedPrices {
  wholesalePrice: number
  retailPrice: number
  retailOfferPrice: number
  wholesaleOfferPrice: number
}

/**
 * Auto-calculate all prices from purchase cost
 * Uses pricing settings percentages
 *
 * Price chain: Cost → Wholesale → Retail → Offers
 *
 * @param purchaseCost Base cost
 * @param pricingSettings Percentages for markups
 * @returns Calculated prices or empty object if cost is 0
 */
export function calculatePricesFromCost(
  purchaseCost: number | null | undefined,
  pricingSettings: any
): Partial<CalculatedPrices> {
  // Don't calculate if cost is zero or negative
  if (!purchaseCost || purchaseCost <= 0) {
    return {}
  }

  // Extract percentages from settings (safe defaults)
  const wholesaleProfit = Number(pricingSettings?.wholesaleProfitPercentage ?? 0)
  const wholesaleOfferPercent = Number(pricingSettings?.wholesaleOfferPercentage ?? 0)
  const retailProfit = Number(pricingSettings?.retailProfitPercentage ?? 0)
  const retailOfferPercent = Number(pricingSettings?.retailOfferPercentage ?? 0)

  // Step 1: Purchase Cost → Wholesale Price
  const wholesalePrice = purchaseCost * (1 + wholesaleProfit / 100)

  // Step 2: Wholesale Price → Wholesale Offer Price
  const wholesaleOfferPrice = wholesalePrice * (1 - wholesaleOfferPercent / 100)

  // Step 3: Wholesale Offer → Retail Price
  const retailPrice = wholesaleOfferPrice * (1 + retailProfit / 100)

  // Step 4: Retail Price → Retail Offer Price
  const retailOfferPrice = retailPrice * (1 - retailOfferPercent / 100)

  // Round all to 2 decimals
  return {
    wholesalePrice: Math.round(wholesalePrice * 100) / 100,
    retailPrice: Math.round(retailPrice * 100) / 100,
    retailOfferPrice: Math.round(retailOfferPrice * 100) / 100,
    wholesaleOfferPrice: Math.round(wholesaleOfferPrice * 100) / 100
  }
}

export interface Margin {
  amount: number
  percentage: number
}

/**
 * Calculate profit margin
 * Returns: {amount: profit, percentage: margin %}
 *
 * @param cost Purchase cost
 * @param price Selling price
 * @returns Margin amount and percentage
 */
export function calculateMargin(
  cost: number | null | undefined,
  price: number | null | undefined
): Margin {
  if (!cost || cost <= 0 || !price) {
    return { amount: 0, percentage: 0 }
  }

  const amount = price - cost
  const percentage = (amount / cost) * 100

  return {
    amount: Math.round(amount * 100) / 100,
    percentage: Math.round(percentage)
  }
}

/**
 * Calculate margin percentage only
 * Used for simple margin display
 *
 * @param cost
 * @param price
 * @returns Margin percentage
 */
export function calculateMarginPercentage(
  cost: number | null | undefined,
  price: number | null | undefined
): number {
  if (!cost || cost <= 0 || !price) {
    return 0
  }

  const percentage = ((price - cost) / cost) * 100
  return Math.round(percentage)
}

/**
 * Check if price is valid (non-negative number)
 * Pure function: price → valid bool
 *
 * @param price
 * @returns True if valid price
 */
export function isValidPrice(price: any): boolean {
  return !isNaN(Number(price)) && Number(price) >= 0
}
