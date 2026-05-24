<?php

namespace App\Traits;

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
            return rtrim(config('app.url'), '/') . '/storage/' . ltrim($cleanPath, '/');
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
        // If thumbnailUrl is already a full URL, use it
        if ($thumbnailUrl && (str_starts_with($thumbnailUrl, 'http://') || str_starts_with($thumbnailUrl, 'https://'))) {
            return [
                'image_url' => $thumbnailUrl,
                'image_id' => $thumbnailId,
            ];
        }

        // If thumbnailPath exists, format it
        if ($thumbnailPath) {
            return [
                'image_url' => $this->getImageUrl($thumbnailPath),
                'image_id' => $thumbnailId,
            ];
        }

        // Return placeholder
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
     * @return string Full image URL or placeholder
     */
    protected function formatVariantThumbnail(?string $thumbnail): string
    {
        return $this->getImageUrl($thumbnail);
    }
}
