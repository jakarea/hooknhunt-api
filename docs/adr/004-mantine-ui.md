# ADR-004: Use Mantine UI for Admin Panel Only

## Status
Accepted

## Context
We need a UI component library for the admin panel with:
- Dark mode support
- Accessible components (WCAG compliant)
- TypeScript support
- No additional CSS files (CSS-in-JS)
- Modern, professional look

## Decision
Use **Mantine UI** for the admin panel. **DO NOT use for storefront**.

## Consequences

### Positive (Admin Panel)
- **70+ components**: Everything we need out of the box
- **Dark mode**: Built-in, easy to implement
- **Accessible**: WCAG 2.1 compliant by default
- **TypeScript**: Full type safety
- **No CSS files**: Emotion-based CSS-in-JS
- **Professional design**: Looks like enterprise software
- **Modular**: Tree-shakeable, small bundle size

### Negative
- **CSS-in-JS**: Slightly slower than Tailwind (not SEO-friendly)
- **Admin-only**: NOT suitable for public-facing storefront

## Why NOT Use Mantine for Storefront?
- **SEO concerns**: CSS-in-JS not ideal for SSR
- **Performance**: Additional runtime overhead
- **Bundle size**: Not optimized for Core Web Vitals
- **Storefront needs**: Pure React + Tailwind is faster/lighter

## Storefront UI Strategy
- **Pure React components** (no component library)
- **Tailwind CSS** for styling
- **Headless UI** libraries (if needed: Radix UI, Shadcn UI)
- **Focus on**: Performance, SEO, Core Web Vitals

## Alternatives Considered

### Material-UI (MUI)
**Rejected**: Heavy bundle size. "Google look" doesn't fit ERP. Harder to customize.

### Chakra UI
**Rejected**: Smaller ecosystem. Heavier than Mantine. Less mature.

### Ant Design
**Rejected**: Too enterprise-focused (not clean/modern). Heavy bundle size.

### Tailwind UI (Admin Kit)
**Rejected**: Would need to build all components ourselves. Slower development.

## References
- https://mantine.dev
- https://mantine.dev/guides/dark-theme/
