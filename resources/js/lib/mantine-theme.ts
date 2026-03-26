import { createTheme } from '@mantine/core';

/**
 * Mantine theme configuration for Hook & Hunt
 *
 * This theme matches the brand colors and styling:
 * - Primary color: Red (matches logo)
 * - Background: #fcf8f6 (very light)
 */
export const theme = createTheme({
  /** Put your mantine theme override here */

  // Font family
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, monospace',

  // Primary color (red to match logo)
  primaryColor: 'red',

  // Custom colors
  colors: {
    // Brand red colors (10 shades from light to dark)
    brand: [
      '#FFE5E5', // shade 0
      '#FFB3B3', // shade 1
      '#FF8080', // shade 2
      '#FF4D4D', // shade 3
      '#FF1A1A', // shade 4
      '#E60000', // shade 5
      '#B30000', // shade 6
      '#800000', // shade 7
      '#4D0000', // shade 8
      '#1A0000', // shade 9
    ],
  },

  // Default radius for components
  defaultRadius: 'md',

  // Spacing
  spacing: {
    xs: '0.625rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },

  // Breakpoints (should match postcss.config.cjs)
  breakpoints: {
    xs: '36em',
    sm: '48em',
    md: '62em',
    lg: '75em',
    xl: '88em',
  },

  // Cursor types
  cursorType: 'pointer',

  // Component-specific overrides can be added here
  components: {
    // Example: Button customization
    // Button: { styles: ... },
  },
});

export default theme;
