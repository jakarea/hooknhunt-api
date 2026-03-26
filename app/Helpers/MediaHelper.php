<?php

namespace App\Helpers;

use App\Models\MediaFile;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Exception;

/**
 * Media Helper - Handle image upload and selection for products
 *
 * This helper provides WordPress-style media functionality:
 * - Upload new images to media library
 * - Select existing images from media library
 * - Avoid duplicate uploads
 * - Return media file IDs for product attachment
 */
class MediaHelper
{
    /**
     * Upload image to media library or return existing media file
     *
     * This function handles two scenarios:
     * 1. Upload new image file and save to media library
     * 2. Return existing media file by ID (selection from library)
     *
     * @param UploadedFile|int $image_input Either uploaded file or media file ID
     * @param string $folder_name Folder path in storage (e.g., 'products', 'categories')
     * @param int|null $user_id ID of user uploading the image
     * @return MediaFile|null The created or retrieved media file
     */
    public static function upload_or_select_image_from_media_library_for_product(
        UploadedFile|int $image_input,
        string $folder_name = 'products',
        ?int $user_id = null
    ): ?MediaFile {
        try {
            // Scenario 1: User uploaded a new image file
            if ($image_input instanceof UploadedFile) {
                return self::upload_new_image_file_to_media_library($image_input, $folder_name, $user_id);
            }

            // Scenario 2: User selected existing image from media library
            if (is_int($image_input)) {
                return self::get_existing_media_file_by_id_from_media_library($image_input);
            }

            // Invalid input type
            return null;

        } catch (Exception $exception) {
            // Log error but don't expose to user
            logger()->error('Media upload failed', [
                'error' => $exception->getMessage(),
                'input_type' => gettype($image_input),
            ]);

            return null;
        }
    }

    /**
     * Upload new image file to media library
     *
     * Handles the actual file upload, storage, and database record creation.
     * Validates image type and size before storing.
     *
     * @param UploadedFile $file The uploaded image file
     * @param string $folder_name Storage folder path
     * @param int|null $user_id ID of user uploading
     * @return MediaFile|null Created media file record
     */
    private static function upload_new_image_file_to_media_library(
        UploadedFile $file,
        string $folder_name,
        ?int $user_id
    ): ?MediaFile {
        // Validate file is an image
        if (!self::check_if_file_is_valid_image($file)) {
            throw new Exception('Invalid image file type');
        }

        // Generate unique filename to avoid conflicts
        $original_file_name = $file->getClientOriginalName();
        $file_extension = $file->getClientOriginalExtension();
        $unique_file_name = self::generate_unique_file_name_for_storage($original_file_name, $file_extension);

        // Build storage path
        $storage_path = "{$folder_name}/" . date('Y/m') . "/{$unique_file_name}";

        // Store file in configured disk (usually 'public')
        $stored_file_path = $file->storeAs(
            $folder_name . '/' . date('Y/m'),
            $unique_file_name,
            'public'
        );

        if (!$stored_file_path) {
            throw new Exception('Failed to store file');
        }

        // Get file size in bytes
        $file_size_in_bytes = $file->getSize();

        // Get MIME type
        $file_mime_type = $file->getMimeType();

        // Create media file record in database
        $media_file_record = MediaFile::create([
            'file_name' => $original_file_name,
            'file_path' => $stored_file_path,
            'file_type' => $file_mime_type,
            'file_size' => $file_size_in_bytes,
            'folder_id' => null, // Can be linked to folder later
            'uploaded_by' => $user_id,
        ]);

        return $media_file_record;
    }

    /**
     * Get existing media file by ID from media library
     *
     * Used when user selects an already-uploaded image from the media library.
     * This prevents duplicate uploads of the same image.
     *
     * @param int $media_file_id ID of the media file to retrieve
     * @return MediaFile|null The media file if found
     */
    private static function get_existing_media_file_by_id_from_media_library(int $media_file_id): ?MediaFile
    {
        return MediaFile::find($media_file_id);
    }

    /**
     * Check if uploaded file is a valid image
     *
     * Validates that the file is an image and within size limits.
     * Supports: jpg, jpeg, png, gif, webp
     *
     * @param UploadedFile $file File to validate
     * @return bool True if valid image, false otherwise
     */
    private static function check_if_file_is_valid_image(UploadedFile $file): bool
    {
        // Allowed image MIME types
        $allowed_image_mime_types = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
        ];

        // Check if MIME type is allowed
        $file_mime_type = $file->getMimeType();
        if (!in_array($file_mime_type, $allowed_image_mime_types)) {
            return false;
        }

        // Check file size (max 10MB)
        $maximum_file_size_in_bytes = 10 * 1024 * 1024; // 10MB
        if ($file->getSize() > $maximum_file_size_in_bytes) {
            return false;
        }

        return true;
    }

    /**
     * Generate unique filename for storage
     *
     * Creates a unique filename by appending timestamp and random string
     * to prevent overwriting files with same names.
     *
     * @param string $original_file_name Original filename from upload
     * @param string $file_extension File extension (jpg, png, etc.)
     * @return string Unique filename safe for storage
     */
    private static function generate_unique_file_name_for_storage(
        string $original_file_name,
        string $file_extension
    ): string {
        // Remove extension from original name
        $file_name_without_extension = pathinfo($original_file_name, PATHINFO_FILENAME);

        // Sanitize filename: remove special characters, spaces
        $sanitized_file_name = preg_replace('/[^A-Za-z0-9_\-]/', '_', $file_name_without_extension);

        // Generate unique suffix
        $current_timestamp = now()->timestamp;
        $random_string = substr(md5(uniqid(mt_rand(), true)), 0, 6);

        // Combine: sanitized_name + timestamp + random + extension
        $unique_file_name = "{$sanitized_file_name}_{$current_timestamp}_{$random_string}.{$file_extension}";

        return $unique_file_name;
    }

    /**
     * Attach media files to product as gallery images
     *
     * Stores multiple media file IDs in the product's gallery_images JSON field.
     * Replaces existing gallery images with new selection.
     *
     * @param int $product_id ID of product to attach images to
     * @param array $media_file_ids Array of media file IDs
     * @return bool True if successful, false otherwise
     */
    public static function attach_multiple_media_files_to_product_gallery(
        int $product_id,
        array $media_file_ids
    ): bool {
        try {
            $product = \App\Models\Product::find($product_id);

            if (!$product) {
                return false;
            }

            // Validate all media file IDs exist
            $valid_media_file_ids = MediaFile::whereIn('id', $media_file_ids)
                ->pluck('id')
                ->toArray();

            // Save as JSON array
            $product->gallery_images = $valid_media_file_ids;
            $product->save();

            return true;

        } catch (Exception $exception) {
            logger()->error('Failed to attach media files to product gallery', [
                'error' => $exception->getMessage(),
                'product_id' => $product_id,
                'media_file_ids' => $media_file_ids,
            ]);

            return false;
        }
    }

    /**
     * Set product thumbnail image
     *
     * Sets the main thumbnail image for a product.
     *
     * @param int $product_id ID of product to set thumbnail for
     * @param int $media_file_id Media file ID to use as thumbnail
     * @return bool True if successful, false otherwise
     */
    public static function set_thumbnail_image_for_single_product(
        int $product_id,
        int $media_file_id
    ): bool {
        try {
            $product = \App\Models\Product::find($product_id);

            if (!$product) {
                return false;
            }

            // Validate media file exists
            $media_file = MediaFile::find($media_file_id);
            if (!$media_file) {
                return false;
            }

            // Set thumbnail
            $product->thumbnail_id = $media_file_id;
            $product->save();

            return true;

        } catch (Exception $exception) {
            logger()->error('Failed to set product thumbnail', [
                'error' => $exception->getMessage(),
                'product_id' => $product_id,
                'media_file_id' => $media_file_id,
            ]);

            return false;
        }
    }

    /**
     * Get full URL for media file
     *
     * Returns the publicly accessible URL for a media file.
     *
     * @param MediaFile $media_file The media file record
     * @return string Full URL to access the file
     */
    public static function get_public_url_for_media_file(MediaFile $media_file): string
    {
        return Storage::disk('public')->url($media_file->file_path);
    }
}
