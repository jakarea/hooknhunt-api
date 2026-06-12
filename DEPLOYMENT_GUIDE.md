# Deployment Guide - Image Serving Fix

## Problem Summary
Images with Bengali/UTF-8 characters in filenames were returning HTML instead of actual image files due to nginx/Laravel routing issues.

## Solution Implemented
1. **New `/media/{id}` route** - Serves images by database ID (ASCII-only URLs)
2. **Updated `ImageHelper` trait** - Returns `/media/{id}` URLs instead of `/storage/{path}`
3. **Fixed route order** - Media routes now come BEFORE the SPA catch-all
4. **Proper caching headers** - 1 year cache for static images

## Deployment Steps

### 1. Backup Current Setup
```bash
# On server
cd /var/www/hooknhunt-api
cp routes/web.php routes/web.php.backup
cp app/Traits/ImageHelper.php app/Traits/ImageHelper.php.backup
```

### 2. Pull Latest Changes
```bash
git pull origin master
```

### 3. Clear All Caches
```bash
php artisan route:clear
php artisan cache:clear
php artisan config:clear
php artisan view:clear
php artisan optimize:clear
```

### 4. Verify Routes
```bash
php artisan route:list | grep media
# Should see: GET|HEAD media/{id} ..... routes/web.php:70
```

### 5. Test Image URLs
```bash
# Test the new /media/{id} route
curl -I https://hooknhunt-api.test/media/1389

# Should return:
# HTTP/2 200
# content-type: image/webp
# cache-control: public, max-age=31536000
```

### 6. Update nginx Configuration (Optional but Recommended)
```bash
# Copy the nginx config
sudo cp nginx.conf.example /etc/nginx/sites-available/hooknhunt-api

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Verification

### Test API Response
```bash
curl https://hooknhunt-api.test/api/v2/store/products/stainless-steel-fishing-bait-spring-feeder-35-55-cm | jq '.data.imageUrl'
# Should return: "https://hooknhunt-api.test/media/1389"
```

### Test in Browser
1. Visit: `https://hooknhunt-api.test/media/1389`
2. Should see the actual product image (not HTML)
3. Open browser DevTools → Network tab
4. Check that image returns `200 OK` with `content-type: image/webp`

### Test Frontend
```bash
# In hooknhunt-ui directory
cd /path/to/hooknhunt-ui

# The API should now return /media/{id} URLs
# Next.js Image component should display them correctly
npm run build
npm run start
```

## Troubleshooting

### Issue: Still seeing HTML instead of images
**Solution:**
```bash
# Clear opcode cache if using OPcache
sudo systemctl restart php8.5-fpm

# Clear Laravel caches again
php artisan route:clear
php artisan cache:clear
```

### Issue: 404 on /media/{id}
**Solution:**
```bash
# Check if media file exists in database
php artisan tinker
>>> DB::table('media_files')->where('id', 1389)->first();

# Check if file exists on disk
ls -la storage/app/public/uploads/ | grep 1389
```

### Issue: Old /storage URLs still being used
**Solution:**
```bash
# The API should automatically use /media/{id} URLs
# If not, check app/Traits/ImageHelper.php is updated
grep "formatProductImage" app/Traits/ImageHelper.php
# Should see: return url('/media/' . $thumbnailId);
```

## Performance Notes

### Current Approach (Laravel serves images)
- **Pros**: Handles UTF-8 filenames, flexible, easy to maintain
- **Cons**: PHP overhead for each image request
- **Estimated**: 10-50ms per image request

### Future Optimization (if needed)
1. **CDN Integration**: Use Cloudflare or AWS CloudFront
2. **Image Optimization Service**: Use ImageOptim or TinyPNG
3. **nginx Direct Serving**: Rename all files to ASCII-only (one-time migration)
4. **Caching Layer**: Add Redis cache for image URLs

## Rollback Plan (if needed)
```bash
# Rollback routes
cp routes/web.php.backup routes/web.php

# Rollback ImageHelper
cp app/Traits/ImageHelper.php.backup app/Traits/ImageHelper.php

# Clear caches
php artisan route:clear
php artisan cache:clear
```

## Success Metrics
✅ All product images load correctly on frontend
✅ Image URLs are ASCII-only (`/media/1389`)
✅ No UTF-8 encoding errors
✅ Images cached for 1 year
✅ API returns proper image URLs
