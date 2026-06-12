<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades Artisan;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\DB;

/*
|--------------------------------------------------------------------------
| MAINTENANCE & SYSTEM ROUTES
|--------------------------------------------------------------------------
| System refresh and maintenance endpoints
| These routes come FIRST
*/

Route::get('/refresh', function () {
    Artisan::call('storage:link');
    Artisan::call('cache:clear');
    Artisan::call('config:clear');
    Artisan::call('config:cache');
    Artisan::call('route:clear');
    Artisan::call('view:clear');
    Artisan::call('optimize:clear');

    return response()->json([
        'status' => 'success',
        'message' => 'System refreshed successfully',
    ]);
})->name('system.refresh');

/*
|--------------------------------------------------------------------------
| MODULE ROUTES
|
| Module-specific routes loaded BEFORE the catch-all
| Order matters: CRM → Website → Other modules
|--------------------------------------------------------------------------
*/

// CRM Module Web Routes
if (file_exists(base_path('Modules/CRM/Routes/web.php'))) {
    require base_path('Modules/CRM/Routes/web.php');
}

// Website Module Web Routes (if exists)
if (file_exists(base_path('Modules/Website/Routes/web.php'))) {
    require base_path('Modules/Website/Routes/web.php');
}

/*
|--------------------------------------------------------------------------
| MEDIA & ASSET ROUTES (CRITICAL - Must come BEFORE catch-all)
|
| These routes handle static file serving with UTF-8 support
| They MUST be defined BEFORE the SPA catch-all route
|--------------------------------------------------------------------------
*/

/**
 * Media Files Route - Serve by ID
 *
 * This is the RECOMMENDED way to serve images:
 * - ASCII-only URLs (no UTF-8 issues)
 * - Fast database lookup
 * - Works with nginx, Apache, etc.
 *
 * URL Format: /media/{id}
 * Example: /media/1389
 */
Route::get('/media/{id}', function ($id) {
    // Validate ID is numeric
    if (!is_numeric($id)) {
        abort(404);
    }

    // Get media file from database
    $mediaFile = DB::table('media_files')
        ->where('id', $id)
        ->first();

    if (!$mediaFile) {
        abort(404, 'Media file not found');
    }

    // Build full file path
    $fullPath = storage_path('app/public/' . $mediaFile->path);

    // Check if file exists
    if (!file_exists($fullPath)) {
        abort(404, 'File not found on storage');
    }

    // Detect MIME type
    $mimeType = mime_content_type($fullPath);
    if ($mimeType === false) {
        // Fallback to common MIME types
        $extension = strtolower(pathinfo($mediaFile->path, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
            'pdf' => 'application/pdf',
        ];
        $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';
    }

    // Return file with caching headers
    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000', // 1 year cache
        'Expires' => gmdate('D, d M Y H:i:s', time() + 31536000) . ' GMT',
    ]);
})->where('id', '[0-9]+')->name('media.file');

/**
 * Storage Files Route - Direct access with UTF-8 support
 *
 * ALTERNATIVE way to serve files (use only if /media/{id} doesn't work)
 * This allows direct storage access while handling UTF-8 filenames
 *
 * URL Format: /storage/{path}
 * Example: /storage/uploads/product-image.webp
 */
Route::get('/storage/{path}', function ($path) {
    // Security: Prevent path traversal
    if (str_contains($path, '..') || str_starts_with($path, '.')) {
        abort(400, 'Invalid path');
    }

    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        abort(404, 'File not found');
    }

    // Detect MIME type
    $mimeType = mime_content_type($fullPath);
    if ($mimeType === false) {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mimeTypes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'gif' => 'image/gif',
            'webp' => 'image/webp',
            'svg' => 'image/svg+xml',
        ];
        $mimeType = $mimeTypes[$extension] ?? 'application/octet-stream';
    }

    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000',
    ]);
})->where('path', '.*')->name('storage.file');

/*
|--------------------------------------------------------------------------
| SPA CATCH-ALL ROUTE (MUST BE LAST)
|
| This route catches ALL remaining requests and serves the SPA
| It MUST come AFTER all other routes
|
| Excluded patterns (not caught by catch-all):
| - api/*: API routes
| - sanctum/*: Laravel Sanctum routes
| - crm/*: CRM module routes
| - media/*: Media file routes
| - storage/*: Storage file routes
|--------------------------------------------------------------------------
*/

Route::get('/{any}', function () {
    return View::make('app');
})->where('any', '^(?!api|sanctum|crm|media|storage).*')
  ->name('spa.catchall');

/*
|--------------------------------------------------------------------------
| ROUTE ARCHITECTURE NOTES
|--------------------------------------------------------------------------
|
| ORDER MATTERS: Routes are matched top-to-bottom. First match wins.
|
| 1. System routes (maintenance, refresh)
| 2. Module routes (CRM, Website, etc.)
| 3. Media routes (MUST come before catch-all)
| 4. Storage routes (MUST come before catch-all)
| 5. SPA catch-all (MUST come last)
|
| TROUBLESHOOTING:
| - Images showing HTML? → Media routes need to come BEFORE catch-all
| - UTF-8 filenames broken? → Use /media/{id} URLs instead of /storage/{path}
| - Routes not working? → Run: php artisan route:clear && php artisan cache:clear
|
| URL PATTERNS:
| - Images: /media/{id} (recommended) or /storage/{path}
| - API: /api/v2/{resource}
| - SPA: / (catches everything else)
|
|--------------------------------------------------------------------------
*/
