# Bundle Budget Guide

## What is Bundle Budgeting?

Bundle budgeting is the practice of setting **maximum limits** for your JavaScript bundle sizes and enforcing them before deployment. This prevents the app from becoming slow over time.

## Budget Limits (Recommended)

### Admin Panel (React + Vite)
- **Initial JS**: < 200KB gzipped
- **Each route chunk**: < 100KB gzipped
- **Total vendor bundle**: < 300KB gzipped
- **Total CSS**: < 50KB gzipped

### Storefront (Next.js 16)
- **First Load JS**: < 200KB gzipped
- **Each page chunk**: < 100KB gzipped
- **Total CSS**: < 30KB gzipped

## How to Check Bundle Size

### Admin Panel (Vite)
```bash
cd resources/js
npm run build

# Check output:
# dist/assets/index-abc123.js  150 kB │ gzip: 45 kB
# dist/assets/vendor-xyz456.js  300 kB │ gzip: 90 kB
```

### Storefront (Next.js)
```bash
cd storefront
npm run build

# Check output for each page:
# ○ / First Load JS shared by all  150 kB
# ├─ /products                    80 kB
# └─ /cart                        60 kB
```

## How to Check Before Adding a Library

### Step 1: Check on bundlephobia.com
Visit https://bundlephobia.com/ and search for the package:

```
moment
→ 67.2 kB minified + gzipped
→ ❌ Use dayjs instead (2 kB)
```

### Step 2: Analyze with `npm-check`
```bash
npx npm-check
```

This shows:
- Package sizes
- Unused dependencies
- Outdated packages

### Step 3: Test locally
```bash
# Install package
npm install package-name

# Build and check size
npm run build

# If over budget, remove and find alternative
npm uninstall package-name
```

## Common Heavy Packages to AVOID

| Package | Size | Alternative |
|---------|------|-------------|
| `moment` | 67 KB | `dayjs` (2 KB) |
| `lodash` | 70 KB | `lodash-es` (24 KB) or native methods |
| `axios` | 35 KB | `fetch` API (built-in) |
| `bootstrap` | 150 KB | `tailwindcss` (JIT, ~10 KB) |
| `material-ui` | 300+ KB | `mantine` (100 KB) or custom |
| `react-bootstrap` | 150 KB | `mantine` or `tailwind` |

## Code Splitting Strategies

### Dynamic Imports (Admin Panel)
```typescript
// ❌ WRONG - Imports entire library at startup
import { Chart } from 'chart.js'

// ✅ CORRECT - Load only when needed
const Chart = dynamic(() => import('chart.js'), { ssr: false })
```

### Next.js Dynamic Imports (Storefront)
```typescript
// ❌ WRONG - Imports heavy component immediately
import HeavyChart from './HeavyChart'

// ✅ CORRECT - Load only when user navigates
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <Skeleton />,
})
```

## Route-Based Splitting

### Admin Panel (Vite)
Vite automatically splits by route. Just use:
```typescript
// App.tsx
import { lazy } from 'react'

const ProductsPage = lazy(() => import('./app/admin/products/page'))
const OrdersPage = lazy(() => import('./app/admin/orders/page'))
```

### Storefront (Next.js)
Next.js automatically splits by page. No action needed!

## Tree Shaking

Ensure you're importing only what you need:

```typescript
// ❌ WRONG - Imports entire library
import _ from 'lodash'
const sorted = _.sortBy(array)

// ✅ CORRECT - Imports only sortBy
import sortBy from 'lodash/sortBy'
const sorted = sortBy(array)

// ✅ BEST - Use native methods
const sorted = array.toSorted()
```

## Monitoring Bundle Size Over Time

### Setup Bundle Analysis
```bash
# Admin Panel
cd resources/js
npm install -D rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({ open: true, filename: 'stats.html' })
  ]
})
```

### CI/CD Check
Add to `.github/workflows/build.yml`:
```yaml
- name: Check bundle size
  run: |
    npm run build
    # Fail if bundle exceeds 300KB
    if [ $(stat -f%z dist/assets/vendor-*.js) -gt 307200 ]; then
      echo "Bundle too large!"
      exit 1
    fi
```

## Quick Checklist Before Adding Any Library

- [ ] Checked bundle size on bundlephobia.com
- [ ] Verified it's < 50KB gzipped
- [ ] No lighter alternative exists
- [ ] Really necessary (not just "nice to have")
- [ ] Will use code splitting if > 20KB
- [ ] Tested local build size impact

## References
- https://bundlephobia.com
- https://vitejs.dev/guide/build.html
- https://nextjs.org/docs/app/building-your-application/optimizing/lazy-loading
