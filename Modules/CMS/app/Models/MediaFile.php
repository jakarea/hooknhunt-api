<?php

namespace App\Modules\CMS\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class MediaFile extends Model
{
    use HasFactory;

    protected $fillable = [
        'folder_id',
        'filename',           // Unique Name
        'original_filename',  // User's original name
        'path',               // Storage Path
        'url',                // Public URL
        'mime_type',
        'size',               // In Bytes (Migration calls it 'size')
        'disk',               // local, s3, public
        'uploaded_by_user_id',
        'is_staff_document',  // Staff document flag

        // Metadata (Optional - if columns exist)
        'width',
        'height',
        'alt_text',
        'variants',           // JSON: { "thumb": "path/thumb.jpg" }
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'variants' => 'array',
        'is_staff_document' => 'boolean',
    ];

    // NOTE: Removed automatic appends to prevent memory exhaustion
    // The 'full_url' accessor uses Storage facade which adds overhead during serialization
    // The 'formatted_size' accessor is lightweight but not always needed
    // Use $file->append('full_url') or $file->append('formatted_size') explicitly when needed
    // protected $appends = ['formatted_size', 'full_url'];

    /**
     * Get the folder that contains the media file (internal to CMS module)
     */
    public function folder(): BelongsTo
    {
        return $this->belongsTo(MediaFolder::class);
    }

    // uploader() relationship removed for 100% module independence
    // CMS module no longer depends on Core module's User model
    // Use uploaded_by_user_id directly and fetch user data via API if needed
    // public function uploader(): BelongsTo
    // {
    //     return $this->belongsTo(\App\Modules\System\Models\User::class, 'uploaded_by_user_id');
    // }

    /**
     * Get uploader user ID (stored as integer, no Core module dependency)
     * Fetch user details via API if needed: /api/core/users/{id}
     */
    public function uploaderId(): int
    {
        return (int) $this->uploaded_by_user_id;
    }

    /**
     * Check if media was uploaded by a specific user ID
     */
    public function isUploadedBy(int $userId): bool
    {
        return $this->uploaded_by_user_id === $userId;
    }

    // MediaUsage relationship removed (polymorphic relationship from unknown module breaks independence)
    // Use API calls to get usages or query the polymorphic table directly
    // public function usages(): MorphMany
    // {
    //     return $this->morphMany(MediaUsage::class, 'media');
    // }

    /**
     * Accessor: Human Readable File Size
     * $file->formatted_size // Output: "2.5 MB"
     */
    protected function formattedSize(): Attribute
    {
        return Attribute::make(
            get: function () {
                // Check if size is null
                if (!$this->size) return '0 B';

                $bytes = $this->size;
                $units = ['B', 'KB', 'MB', 'GB', 'TB'];

                for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
                    $bytes /= 1024;
                }

                return round($bytes, 2) . ' ' . $units[$i];
            },
        );
    }

    /**
     * Accessor: Full URL Logic
     * Handles Cloud Storage (S3) or Local
     */
    protected function fullUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                // 1. If absolute URL exists in DB, use it
                if (str_starts_with($this->url, 'http')) {
                    return $this->url;
                }
                
                // 2. Otherwise generate from Disk
                return Storage::disk($this->disk ?? 'public')->url($this->path);
            },
        );
    }

    /**
     * Helper: Check File Types
     */
    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }

    public function isVideo(): bool
    {
        return str_starts_with($this->mime_type, 'video/');
    }

    public function isDocument(): bool
    {
        return str_starts_with($this->mime_type, 'application/') ||
               str_starts_with($this->mime_type, 'text/') || 
               str_contains($this->mime_type, 'pdf');
    }

    /**
     * Helper: Get Thumbnail
     * Returns variant thumb if exists, otherwise original image
     */
    public function getThumbnailUrl(): string
    {
        if (!empty($this->variants['thumbnail'])) {
            $path = $this->variants['thumbnail'];
            // If path is full URL
            if (str_starts_with($path, 'http')) return $path;
            
            return Storage::disk($this->disk ?? 'public')->url($path);
        }

        return $this->isImage() ? $this->full_url : asset('assets/icons/file-icon.png');
    }
}