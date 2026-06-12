<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\View;
/*
|--------------------------------------------------------------------------
| System Refresh (Optional – secure it later)
|--------------------------------------------------------------------------
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
});

/*
|--------------------------------------------------------------------------
| CRM Module Web Routes (Load BEFORE React Catch-All)
|--------------------------------------------------------------------------
*/
if (file_exists(base_path('Modules/CRM/Routes/web.php'))) {
    require base_path('Modules/CRM/Routes/web.php');
}

/*
|--------------------------------------------------------------------------
| Media Files Route (Serve by ID)
|--------------------------------------------------------------------------
| Serve media files by ID to avoid UTF-8 filename issues
| This route MUST come before the React catch-all route
*/
Route::get('/media/{id}', function ($id) {
    $mediaFile = \Illuminate\Support\Facades\DB::table('media_files')
        ->where('id', $id)
        ->first();

    if (!$mediaFile) {
        abort(404);
    }

    $fullPath = storage_path('app/public/' . $mediaFile->path);

    if (!file_exists($fullPath)) {
        abort(404);
    }

    $mimeType = mime_content_type($fullPath);
    if ($mimeType === false) {
        // Fallback to common mime types
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

    return response()->file($fullPath, [
        'Content-Type' => $mimeType,
        'Cache-Control' => 'public, max-age=31536000', // 1 year cache
    ]);
})->where('id', '[0-9]+');

/*
|--------------------------------------------------------------------------
| React SPA Catch-All
|--------------------------------------------------------------------------
| Root (/) সহ সব non-API request React index.html serve করবে
*/
Route::get('/{any}', function () {
    return View::make('app');
})->where('any', '^(?!api|sanctum|crm|media).*');

