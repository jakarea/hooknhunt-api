# Laravel Routes Architecture - hooknhunt-api

## Current Route Structure (FIXED)

### 1. API Routes (`routes/api.php`)
- Versioned API: `/api/v2/*`
- Public endpoints: `/api/v2/store/*`
- Admin endpoints: `/api/v2/admin/*`
- Auth endpoints: `/api/v2/auth/*`

### 2. Web Routes (`routes/web.php`)

#### Route Order (CRITICAL - Must be in this order):

```php
<?php

// 1. MAINTENANCE ROUTE (if needed)
Route::get('/refresh', function () {
    // System refresh commands
})->where('any', 'refresh');

// 2. MODULE ROUTES (Load BEFORE catch-all)
// CRM module has its own web routes
if (file_exists(base_path('Modules/CRM/Routes/web.php'))) {
    require base_path('Modules/CRM/Routes/web.php');
}

// 3. MEDIA FILES ROUTE (CRITICAL - Must come BEFORE catch-all)
// Serves images by ID to avoid UTF-8 filename issues
Route::get('/media/{id}', function ($id) {
    $mediaFile = DB::table('media_files')->where('id', $id)->first();

    if (!$mediaFile) {
        abort(404);
    }

    $fullPath = storage_path('app/public/' . $mediaFile->path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    $mimeType = mime_content_type($fullPath) ?: 'image/jpeg';

    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000', // 1 year cache
    ]);
})->where('id', '[0-9]+')->name('media.file');

// 4. STORAGE FILES ROUTE (Alternative UTF-8 safe method)
// This allows direct storage access while handling UTF-8 filenames
Route::get('/storage/{path}', function ($path) {
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    $mimeType = mime_content_type($fullPath) ?: 'application/octet-stream';

    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('path', '.*');

// 5. SPA CATCH-ALL ROUTE (MUST BE LAST)
// Excludes: api, sanctum, crm, media, storage
Route::get('/{any}', function () {
    return View::make('app');
})->where('any', '^(?!api|sanctum|crm|media|storage).*');
```

## Why This Order Matters

Routes are matched top-to-bottom. The first matching route wins.

**Wrong Order (causes issues):**
```php
// ❌ BAD: Catch-all comes first - everything matches this
Route::get('/{any}', function () {
    return View::make('app');
});

// These never get reached because catch-all matched first
Route::get('/media/{id}', ...);
Route::get('/storage/{path}', ...);
```

**Correct Order (works properly):**
```php
// ✅ GOOD: Specific routes first
Route::get('/media/{id}', ...);
Route::get('/storage/{path}', ...);

// Catch-all comes last - only matches if nothing else did
Route::get('/{any}', ...);
```

## URL Patterns

### Image URLs (Use this format):
- **Recommended**: `/media/{id}` (e.g., `/media/1389`)
  - ASCII-only, no encoding issues
  - Fast database lookup
  - Works everywhere

- **Alternative**: `/storage/{path}` (e.g., `/storage/uploads/file.webp`)
  - May have UTF-8 encoding issues
  - Only use if filename is ASCII-only

### API URLs:
- Products: `/api/v2/store/products`
- Categories: `/api/v2/store/categories`
- Auth: `/api/v2/store/auth/*`

## Troubleshooting

### Issue: Images return HTML/SPA instead of actual files
**Cause**: Catch-all route is matching before media route
**Fix**: Ensure media routes come BEFORE catch-all in web.php

### Issue: UTF-8 filenames cause 404 errors
**Cause**: nginx or Laravel can't handle UTF-8 characters
**Fix**: Use `/media/{id}` URLs instead of `/storage/{path}`

### Issue: Routes not registering
**Fix**: Run `php artisan route:clear` and `php artisan cache:clear`

## Next.js Frontend Configuration

### API Proxy (next.config.ts):
```typescript
async rewrites() {
  return [
    {
      source: '/api/v2/:path*',
      destination: 'https://hooknhunt-api.test/api/v2/:path*',
    },
  ];
}
```

### Image Configuration:
```typescript
images: {
  unoptimized: true, // Avoid optimization issues
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'hooknhunt-api.test',
      pathname: '/media/**', // Use /media/ URLs
    },
  ],
}
```

## Migration Plan

### Phase 1: Update Routes (Current)
- ✅ Add `/media/{id}` route
- ✅ Update ImageHelper trait
- ✅ Fix route order

### Phase 2: Update Database
- Run migration to ensure all media_files have proper IDs
- Update any hardcoded `/storage/` URLs to `/media/`

### Phase 3: Update Frontend
- Update Next.js to use `/media/` URLs
- Update image components
- Test all image displays

### Phase 4: Deploy nginx Config
- Deploy nginx.conf.example to server
- Test static file serving
- Verify UTF-8 support
