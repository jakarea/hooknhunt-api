# API Image URL Standardization - Frontend Update Guide

## Overview
All public storefront API responses have been updated to return **consistent image URL formatting** with full base URLs and placeholder fallbacks.

**Date:** 2025-05-24
**Base URL:** `https://hooknhunt-api.test`
**Placeholder:** `https://hooknhunt-api.test/storage/placeholder.jpg`

---

## Breaking Changes

### Image Field Names Changed

All APIs now use **`image_url`** instead of various field names:
- ❌ `image` → ✅ `image_url`
- ❌ `featured_image` → ✅ `image_url`
- ❌ `thumbnail` → ✅ `image_url`
- ❌ `thumbnailUrl` → ✅ `image_url`
- ❌ `thumbnail_url` → ✅ `image_url`
- ❌ `thumbnail_path` → ✅ `image_url`

### New `image_id` Field
All image responses now include an `image_id` field alongside `image_url`.

---

## API Endpoints Updated

### 1. Product APIs

#### `GET /api/v2/store/products`
**Before:**
```json
{
  "data": {
    "id": 1,
    "name": "Product Name",
    "image": "https://...",
    "featured_image": "https://...",
    "price": 100
  }
}
```

**After:**
```json
{
  "data": {
    "id": 1,
    "name": "Product Name",
    "image_url": "https://hooknhunt-api.test/storage/uploads/image.jpg",
    "image_id": 123,
    "price": 100
  }
}
```

#### `GET /api/v2/store/products/{slug}`
**Changes:**
- `image` → `image_url`
- `featured_image` → removed
- `thumbnailUrl` → `image_url`
- `thumbnail` object → `image_id` (flat field)
- `galleryImages` → `gallery_images` (with `image_url` in each item)

**Before:**
```json
{
  "id": 1,
  "image": "https://...",
  "featured_image": "https://...",
  "thumbnail": {
    "id": 123,
    "fullUrl": "https://...",
    "alt": "filename.jpg"
  },
  "thumbnailUrl": "https://...",
  "galleryImages": [
    {"fullUrl": "https://..."}
  ]
}
```

**After:**
```json
{
  "id": 1,
  "image_url": "https://hooknhunt-api.test/storage/uploads/image.jpg",
  "image_id": 123,
  "gallery_images": [
    {"image_url": "https://hooknhunt-api.test/storage/uploads/image2.jpg"}
  ]
}
```

#### Other Product APIs
All return the same format:
- `GET /api/v2/store/products/hot-deals`
- `GET /api/v2/store/products/featured`
- `GET /api/v2/store/categories/{categorySlug}/products`
- `GET /api/v2/store/products/{slug}/related`
- `GET /api/v2/store/thank-you-products`
- `GET /api/v2/store/cross-sale-products`

### 2. Search APIs

#### `GET /api/v2/store/search`
**Before:**
```json
{
  "data": {
    "id": 1,
    "image": "https://...",
    "thumbnail": {
      "id": 123,
      "fullUrl": "https://..."
    }
  }
}
```

**After:**
```json
{
  "data": {
    "id": 1,
    "image_url": "https://hooknhunt-api.test/storage/uploads/image.jpg",
    "image_id": 123
  }
}
```

#### `GET /api/v2/store/search/suggestions`
**Before:**
```json
{
  "suggestions": [{
    "id": 1,
    "image": "https://...",
    "thumbnail": {"fullUrl": "https://..."}
  }]
}
```

**After:**
```json
{
  "suggestions": [{
    "id": 1,
    "image_url": "https://hooknhunt-api.test/storage/uploads/image.jpg",
    "image_id": 123
  }]
}
```

### 3. Category APIs

#### `GET /api/v2/store/categories`
**Before:**
```json
{
  "id": 1,
  "name": "Category Name",
  "image": {"full_url": "https://..."},
  "image_url": "https://..."
}
```

**After:**
```json
{
  "id": 1,
  "name": "Category Name",
  "image_url": "https://hooknhunt-api.test/storage/uploads/category.jpg",
  "image_id": 456
}
```

#### `GET /api/v2/store/categories/{slug}`
Same format as above.

### 4. Slider API

#### `GET /api/v2/store/sliders`
**Before:**
```json
{
  "id": 1,
  "media_type": "image",
  "image_url": "relative/path/or/null",
  "video_url": "https://youtube.com/..."
}
```

**After:**
```json
{
  "id": 1,
  "media_type": "image",
  "image_url": "https://hooknhunt-api.test/storage/uploads/slider.jpg",
  "video_url": "https://youtube.com/watch?v=..."
}
```

**Important:** Sliders can be **images OR videos**:
- **Image sliders** (`media_type: "image"`): `image_url` returns full URL with placeholder fallback
- **Video sliders** (`media_type: "video"`): `image_url` is `null`, `video_url` contains YouTube/embed URL (unchanged)

**Frontend handling:**
```typescript
// Render based on media type
if (slider.media_type === 'video') {
  // Render video player with video_url
  <iframe src={slider.video_url} />
} else {
  // Render image with image_url
  <img src={slider.image_url} alt={slider.title} />
}
```

### 5. Review APIs

#### `GET /api/v2/store/reviews`
**Before:**
```json
{
  "id": 1,
  "rating": 5,
  "review_text": "Great product!",
  "screenshot_id": 789
}
```

**After:**
```json
{
  "id": 1,
  "rating": 5,
  "review_text": "Great product!",
  "image_url": "https://hooknhunt-api.test/storage/uploads/screenshot.jpg",
  "image_id": 789
}
```

#### `GET /api/v2/store/reviews/featured`
#### `GET /api/v2/store/reviews/product/{productSlug}`
Same format as above.

### 6. Order APIs

#### `GET /api/v2/store/account/orders`
**Before:**
```json
{
  "items": [{
    "id": 1,
    "thumbnail_path": "uploads/image.jpg",
    "thumbnail_url": "https://..."
  }]
}
```

**After:**
```json
{
  "items": [{
    "id": 1,
    "image_url": "https://hooknhunt-api.test/storage/uploads/image.jpg",
    "image_id": 123
  }]
}
```

#### `GET /api/v2/store/account/orders/{invoice_no}`
**Before:**
```json
{
  "items": [{
    "total_price_formatted": "100.00",
    "thumbnail_url": "..."
  }]
}
```

**After:**
```json
{
  "items": [{
    "total_price_formatted": "100.00",
    "image_url": "https://hooknhunt-api.test/storage/uploads/image.jpg",
    "image_id": 123
  }]
}
```

---

## Frontend Migration Steps

### 1. Update All Image Field References
Replace all occurrences of old field names with `image_url`:

```typescript
// ❌ Before
product.image
product.featured_image
product.thumbnailUrl
product.thumbnail?.fullUrl

// ✅ After
product.image_url
```

### 2. Update Image Components
Ensure components handle the new field name:

```typescript
// ProductCard component
<img src={product.image_url} alt={product.name} />

// With fallback (optional, as API now returns placeholder)
<img
  src={product.image_url || '/placeholder.jpg'}
  alt={product.name}
/>
```

### 3. Update Gallery Images
For product detail pages:

```typescript
// ❌ Before
product.galleryImages?.map(img => img.fullUrl)

// ✅ After
product.gallery_images?.map(img => img.image_url)
```

### 4. Update Category Images
```typescript
// ❌ Before
category.image?.full_url
category.image_url (mixed)

// ✅ After
category.image_url
```

### 5. Update Review Images
```typescript
// ❌ Before
review.screenshot_id (need separate API call)

// ✅ After
review.image_url (direct URL available)
```

### 6. Update Order Items
```typescript
// ❌ Before
item.thumbnail_url
item.thumbnail_path

// ✅ After
item.image_url
```

---

## Placeholder Image

All APIs now return a placeholder image when no image is available:
**URL:** `https://hooknhunt-api.test/storage/placeholder.jpg`

You can use this in your components or provide your own fallback:

```typescript
const displayImage = product.image_url !==
  'https://hooknhunt-api.test/storage/placeholder.jpg'
  ? product.image_url
  : '/custom-placeholder.jpg';
```

---

## Testing Checklist

- [ ] Product listing page displays images correctly
- [ ] Product detail page shows main image and gallery
- [ ] Search results show product images
- [ ] Category pages display category images
- [ ] Homepage sliders display correctly
- [ ] Review section shows screenshots
- [ ] Order history displays product images
- [ ] No broken images (404 errors)
- [ ] Placeholder image shows where appropriate

---

## Notes

1. **Backward Compatibility:** These are **breaking changes**. The old field names are no longer returned.

2. **Image URLs:** All URLs are now absolute (full URLs including domain).

3. **Placeholder:** A placeholder image is returned for missing images instead of `null`.

4. **Image ID:** The `image_id` field can be used for caching or future API calls.

5. **Variant Images:** Product variant thumbnails also use `image_url` field.

---

## Questions?

If you encounter any issues or have questions about these changes, please contact the backend team.

**Files Changed:**
- `app/Traits/ImageHelper.php` (new)
- `Modules/Website/app/Http/Controllers/Api/V2/Website/ProductController.php`
- `Modules/Website/app/Http/Controllers/Api/V2/Website/OrderController.php`
- `Modules/Website/app/Http/Controllers/Api/V2/Website/ReviewController.php`
- `Modules/Website/app/Http/Controllers/Api/V2/Website/StorefrontSliderController.php`
- `Modules/Website/app/Http/Controllers/Api/V2/CategoryController.php`
- `app/Http/Controllers/Api/V2/PublicController.php`
