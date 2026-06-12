<?php
/**
 * Fix media filenames with non-ASCII characters
 *
 * This script renames files in the media_files table and on the filesystem
 * to use ASCII-only filenames (URL-encoded or transliterated).
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

echo "Starting media filename fix...\n";

// Get all media files with non-ASCII characters in path
$mediaFiles = DB::table('media_files')
    ->where('path', 'like', '%uploads/%')
    ->select('id', 'path', 'url')
    ->get();

echo "Found {$mediaFiles->count()} media files to check\n";

$fixedCount = 0;
$errorCount = 0;

foreach ($mediaFiles as $media) {
    $originalPath = $media->path;
    $originalUrl = $media->url;

    // Check if path contains non-ASCII characters
    if (!preg_match('/[^\x20-\x7E]/', $originalPath)) {
        continue; // Skip ASCII-only filenames
    }

    echo "Processing ID {$media->id}: {$originalPath}\n";

    try {
        // Extract filename and directory
        $pathInfo = pathinfo($originalPath);
        $directory = dirname($originalPath);
        $extension = $pathInfo['extension'] ?? '';
        $filenameWithoutExt = $pathInfo['filename'] ?? '';

        // Generate ASCII-only filename using timestamp + random string
        $newFilename = time() . '_' . Str::random(8) . '.' . $extension;

        // Build new path
        $newPath = $directory . '/' . $newFilename;

        // Build new URL
        $parsedUrl = parse_url($originalUrl);
        if ($parsedUrl) {
            $newUrl = ($parsedUrl['scheme'] ?? 'https') . '://';
            $newUrl .= $parsedUrl['host'] ?? '';
            if (isset($parsedUrl['port'])) {
                $newUrl .= ':' . $parsedUrl['port'];
            }
            $newUrl .= '/storage/' . $newPath;
            if (isset($parsedUrl['query'])) {
                $newUrl .= '?' . $parsedUrl['query'];
            }
        } else {
            $newUrl = config('app.url') . '/storage/' . $newPath;
        }

        // Rename file on filesystem
        $oldFullPath = storage_path('app/public/' . $originalPath);
        $newFullPath = storage_path('app/public/' . $newPath);

        if (file_exists($oldFullPath)) {
            if (!file_exists(dirname($newFullPath))) {
                mkdir(dirname($newFullPath), 0755, true);
            }

            if (rename($oldFullPath, $newFullPath)) {
                // Update database
                DB::table('media_files')
                    ->where('id', $media->id)
                    ->update([
                        'path' => $newPath,
                        'url' => $newUrl,
                    ]);

                echo "  ✓ Renamed to: {$newPath}\n";
                $fixedCount++;
            } else {
                echo "  ✗ Failed to rename file\n";
                $errorCount++;
            }
        } else {
            echo "  ⚠ File not found on filesystem: {$oldFullPath}\n";
            // Still update database to fix URLs
            DB::table('media_files')
                ->where('id', $media->id)
                ->update([
                    'path' => $newPath,
                    'url' => $newUrl,
                ]);
            $fixedCount++;
        }
    } catch (\Exception $e) {
        echo "  ✗ Error: " . $e->getMessage() . "\n";
        $errorCount++;
    }
}

echo "\n=== Summary ===\n";
echo "Fixed: {$fixedCount}\n";
echo "Errors: {$errorCount}\n";
echo "Total checked: {$mediaFiles->count()}\n";
