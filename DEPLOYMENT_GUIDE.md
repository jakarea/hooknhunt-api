# 🚀 CRITICAL MEMORY FIX - DEPLOYMENT GUIDE

## ⚠️ Problem
- Memory exhaustion: 512MB limit
- Single product view crashing
- Product list not loading

## ✅ SOLUTIONS

### 1. Upload These Files IMMEDIATELY:

**Required Files:**
```
✅ app/Models/Product.php
✅ app/Models/ProductVariant.php  
✅ app/Models/MediaFile.php
✅ app/Http/Controllers/Api/V2/ProductController.php
✅ resources/js/app/admin/catalog/products/[id]/page.tsx
```

### 2. Add Memory Limit Configuration:

**Option A: .htaccess (Recommended for cPanel)**

Add this to `public/.htaccess`:

```apache
# Increase PHP memory limit
<IfModule mod_php8.c>
    php_value memory_limit 768M
    php_value max_execution_time 300
</IfModule>

<IfModule mod_fcgid.c>
    FcgidInitialEnv HTTP_PHP_VALUE "memory_limit=768M"
</IfModule>

<Files ".php*">
    SetEnv PHP_VALUE "memory_limit=768M"
</Files>
```

**Option B: php.ini (If you have access)**

```ini
memory_limit = 768M
max_execution_time = 300
```

**Option C: cPanel Select PHP Version**

1. Login to cPanel
2. Go to **Select PHP Version**
3. Switch to **PHP 8.1** or **PHP 8.2**
4. Click **Transition PHP Extensions**
5. Find **memory_limit** and set to `768M`

### 3. Run Database Optimizations:

```sql
-- Only run indexes that don't exist yet
ALTER TABLE products ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE product_variants ADD INDEX idx_deleted_at (deleted_at);
ALTER TABLE product_variants ADD INDEX idx_sku_search (sku(100));
```

### 4. Clear Application Cache:

```bash
# From project root via SSH
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan optimize:clear
```

## 🎯 What Changed:

### Models - Removed Auto-Appends:
- **Product.php**: Removed `gallery_images_urls`, `cross_sale_products`, `up_sale_products`
- **ProductVariant.php**: Removed `current_stock`, `full_name`
- **MediaFile.php**: Removed `formatted_size`, `full_url`

### Controller - Ultra Lightweight Queries:
- **index()**: Only select needed columns, max 500 per page
- **show()**: Minimal query, no variants loaded

## 📊 Expected Performance:

```
Before: 512MB exhausted, crashes
After:  ~50-100MB per request, works fine

Product List (100 items): ~50MB
Product Detail:         ~20MB
```

## 🔧 Troubleshooting:

**If still getting memory errors:**

1. Check current PHP memory limit:
   ```php
   <?php phpinfo(); ?>
   ```

2. Restart PHP-FPM (if using):
   ```bash
   sudo service php-fpm restart
   ```

3. Clear server cache:
   ```bash
   rm -rf storage/framework/cache/*
   ```

4. Check for other memory-intensive operations:
   ```bash
   # Check queue workers
   php artisan queue:failed
   ```

## 📝 Variants Not Loading?

The show() method now returns empty variants. Frontend should fetch variants from:
```
GET /api/v2/catalog/products/{id}/variants
```

Or add variants back to show() method if memory allows.

## ✅ Verification:

Test these URLs after deployment:
- Product List: https://probesh.hooknhunt.com/api/v2/catalog/products?per_page=100&page=1
- Product Detail: https://probesh.hooknhunt.com/catalog/products/15

Both should load without errors! 🎉
