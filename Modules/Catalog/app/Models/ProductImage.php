<?php

namespace App\Modules\Catalog\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductImage extends Model
{
    use HasFactory;

    protected $table = 'catalog_product_images';

    protected $guarded = ['id'];

    protected $fillable = [
        'product_id',
        'url',
        'file_name',
        'original_filename',
        'mime_type',
        'size',
        'width',
        'height',
        'disk',
        'path',
        'is_thumbnail',
        'sort_order',
        'alt_text',
    ];

    protected $casts = [
        'size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'is_thumbnail' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Get the product that owns the image
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Scope to get only thumbnail images
     */
    public function scopeThumbnail($query): void
    {
        $query->where('is_thumbnail', true);
    }

    /**
     * Scope to get only gallery images (not thumbnails)
     */
    public function scopeGallery($query): void
    {
        $query->where('is_thumbnail', false);
    }

    /**
     * Get formatted file size (e.g., "2.5 MB")
     */
    public function getFormattedSizeAttribute(): string
    {
        if (!$this->size) {
            return '0 B';
        }

        $bytes = $this->size;
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Get full URL based on disk
     */
    public function getFullUrlAttribute(): string
    {
        if ($this->disk === 's3' || str_starts_with($this->url, 'http')) {
            return $this->url;
        }

        return asset($this->url);
    }
}
