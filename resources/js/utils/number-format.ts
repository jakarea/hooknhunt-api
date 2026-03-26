/**
 * Safe number formatting utilities
 * Prevents "toFixed is not a function" errors when API returns decimal fields as strings
 */

/**
 * Safely convert a value to a number and format with fixed decimal places
 * @param value - The value to format (can be string, number, or undefined/null)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string, or "0.00" if value is invalid
 */
export function safeToFixed(value: any, decimals: number = 2): string {
  const num = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(num) ? '0.00' : num.toFixed(decimals)
}

/**
 * Safely convert a value to a number
 * @param value - The value to convert (can be string, number, or undefined/null)
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns Number, or defaultValue if value is invalid
 */
export function toSafeNumber(value: any, defaultValue: number = 0): number {
  const num = typeof value === 'number' ? value : parseFloat(value)
  return isNaN(num) ? defaultValue : num
}
