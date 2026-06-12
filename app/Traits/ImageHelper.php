<?php
/* hooknhunt-api/app/Traits/ImageHelper.php */
namespace App\Traits;

use Illuminate\Support\Facades\DB;

trait ImageHelper
{
    /**
     * Get full image URL with fallback to placeholder
     *
     * @param string|null $path Image path from database (relative or absolute)
     * @param string|null $fallbackPath Custom fallback path (optional)
     * @return string Full image URL or placeholder URL
     */
    protected function getImageUrl(?string $path, ?string $fallbackPath = null): string
    {
        // If path is already a full URL, return it
        if ($path && (str_starts_with($path, 'http://') || str_starts_with($path, 'https://'))) {
            return $path;
        }

        // If path exists, format it with base URL
        if ($path) {
            // Remove leading 'storage/' if present to avoid duplication
            $cleanPath = str_starts_with($path, 'storage/') ? substr($path, 8) : $path;
            $cleanPath = ltrim($cleanPath, '/');

            // Split path into directory and filename to URL-encode only the filename
            $pathParts = explode('/', $cleanPath);
            $filename = array_pop($pathParts);
            $directory = implode('/', $pathParts);

            // URL-encode the filename to handle special characters
            $encodedFilename = rawurlencode($filename);

            // Rebuild the path
            $encodedPath = $directory ? $directory . '/' . $encodedFilename : $encodedFilename;

            return rtrim(config('app.url'), '/') . '/storage/' . $encodedPath;
        }

        // Return fallback or default placeholder
        return $fallbackPath ?? $this->getDefaultPlaceholderUrl();
    }

    /**
     * Get default placeholder image URL
     *
     * @return string Default placeholder URL
     */
    protected function getDefaultPlaceholderUrl(): string
    {
        return rtrim(config('app.url'), '/') . '/storage/placeholder.jpg';
    }

    /**
     * Format product image URL with standard format
     *
     * @param string|null $thumbnailId Thumbnail ID from media_files
     * @param string|null $thumbnailPath Thumbnail path
     * @param string|null $thumbnailUrl Thumbnail URL (already formatted)
     * @return array Standardized image response
     */
    protected function formatProductImage(?string $thumbnailId, ?string $thumbnailPath, ?string $thumbnailUrl): array
    {
        // Use /media/{id} URL format to avoid UTF-8 filename issues
        if ($thumbnailId) {
            return [
                'image_url' => url('/media/' . $thumbnailId),
                'image_id' => $thumbnailId,
            ];
        }

        // Return placeholder if no ID
        return [
            'image_url' => $this->getDefaultPlaceholderUrl(),
            'image_id' => null,
        ];
    }

    /**
     * Format category image URL with standard format
     *
     * @param string|null $imageId Category image ID
     * @param string|null $imageUrl Category image URL (already formatted)
     * @param string|null $imagePath Category image path
     * @return array Standardized image response
     */
    protected function formatCategoryImage(?string $imageId, ?string $imageUrl, ?string $imagePath): array
    {
        // If imageUrl is already a full URL, use it
        if ($imageUrl && (str_starts_with($imageUrl, 'http://') || str_starts_with($imageUrl, 'https://'))) {
            return [
                'image_url' => $imageUrl,
                'image_id' => $imageId,
            ];
        }

        // If imagePath exists, format it
        if ($imagePath) {
            return [
                'image_url' => $this->getImageUrl($imagePath),
                'image_id' => $imageId,
            ];
        }

        // If imageId exists as path reference, format it
        if ($imageId) {
            return [
                'image_url' => $this->getImageUrl($imageId),
                'image_id' => $imageId,
            ];
        }

        // Return placeholder
        return [
            'image_url' => $this->getDefaultPlaceholderUrl(),
            'image_id' => null,
        ];
    }

    /**
     * Format review screenshot image URL with standard format
     *
     * @param int|null $screenshotId Screenshot media file ID
     * @param string|null $screenshotPath Screenshot path
     * @return array Standardized image response
     */
    protected function formatScreenshotImage(?int $screenshotId, ?string $screenshotPath): array
    {
        if ($screenshotId && $screenshotPath) {
            return [
                'image_url' => $this->getImageUrl($screenshotPath),
                'image_id' => $screenshotId,
            ];
        }

        // Return placeholder if no screenshot
        return [
            'image_url' => $this->getDefaultPlaceholderUrl(),
            'image_id' => null,
        ];
    }

    /**
     * Format slider image URL with standard format
     *
     * @param string|null $imageUrl Image URL from database
     * @return string Full image URL or placeholder
     */
    protected function formatSliderImage(?string $imageUrl): string
    {
        return $this->getImageUrl($imageUrl);
    }

    /**
     * Format variant thumbnail URL with standard format
     *
     * @param string|null $thumbnail Variant thumbnail path
     * @param string|null $fallback Fallback image URL (usually product thumbnail)
     * @return string Full image URL or placeholder
     */
    protected function formatVariantThumbnail(?string $thumbnail, ?string $fallback = null): string
    {
        // If variant has its own thumbnail, use it
        if ($thumbnail && !empty($thumbnail)) {
            return $this->getImageUrl($thumbnail);
        }

        // Fall back to product thumbnail
        if ($fallback) {
            return $fallback;
        }

        // Last resort: return placeholder
        return $this->getDefaultPlaceholderUrl();
    }

    /**
     * Format variant thumbnail URL from media_files data
     * Follows same pattern as product thumbnail (formatProductImage)
     * Priority: thumbnail_id (media) → legacy thumbnail (string) → product thumbnail → placeholder
     *
     * @param int|null $thumbnailId media_files.id
     * @param string|null $thumbnailPath media_files.path
     * @param string|null $thumbnailUrl media_files.url
     * @param string|null $legacyThumbnail Old thumbnail field (backward compatibility)
     * @param string|null $fallback Fallback image URL (usually product thumbnail)
     * @return string Full image URL or placeholder
     */
    protected function formatVariantThumbnailFromMedia(
        ?int $thumbnailId,
        ?string $thumbnailPath,
        ?string $thumbnailUrl,
        ?string $legacyThumbnail = null,
        ?string $fallback = null
    ): string {
        // 1. Try new thumbnail_id approach (media_files)
        if ($thumbnailId && !empty($thumbnailId)) {
            return url('/media/' . $thumbnailId);
        }

        // 2. Fallback to media file path/url if available
        if ($thumbnailUrl && !empty($thumbnailUrl)) {
            return $thumbnailUrl;
        }

        if ($thumbnailPath && !empty($thumbnailPath)) {
            return $this->getImageUrl($thumbnailPath);
        }

        // 3. Legacy: try old thumbnail field (backward compatibility during migration)
        if ($legacyThumbnail && !empty($legacyThumbnail)) {
            // If it's already a full URL, return it
            if (str_starts_with($legacyThumbnail, 'http')) {
                return $legacyThumbnail;
            }
            // Otherwise, treat it as a path
            return $this->getImageUrl($legacyThumbnail);
        }

        // 4. Final fallback to product thumbnail
        if ($fallback) {
            return $fallback;
        }

        // 5. Last resort: placeholder
        return $this->getDefaultPlaceholderUrl();
    }

    /**
     * Get gallery image URLs from media_files table
     *
     * Uses media_files table since gallery_images stores media_files IDs.
     * Preserves the order of images as stored in gallery_images array.
     *
     * @param array|null $galleryIds Array of media_files IDs
     * @return array Array of image URLs in original order
     */
    protected function getGalleryImagesUrlsDirect(?array $galleryIds): array
    {
        if (empty($galleryIds) || !is_array($galleryIds)) {
            return [];
        }

        $urls = [];
        foreach ($galleryIds as $id) {
            // Use /media/{id} URL format to avoid UTF-8 filename issues
            $urls[] = url('/media/' . $id);
        }

        return $urls;
    }
}
