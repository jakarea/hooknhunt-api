<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected $fillable = [
        'name',
        'retail_name',
        'wholesale_name',
        'custom_name',
        'slug',
        'category_id',
        'brand_id',
        'thumbnail_id',
        'gallery_images',
        'description',
        'short_description',
        'video_url',
        'seo_title',
        'seo_description',
        'seo_tags',
        'status',
        'warranty_enabled',
        'warranty_details',
        'highlights',
        'includes_in_box',
    ];

    protected $casts = [
        'gallery_images' => 'array', // JSON Column for multiple images
        'seo_tags' => 'array', // JSON Column for SEO tags
        'highlights' => 'array', // JSON Column for product highlights
        'includes_in_box' => 'array', // JSON Column for items included in box
        'warranty_enabled' => 'boolean',
    ];

    // Automatically append gallery images URLs to JSON response
    protected $appends = ['gallery_images_urls'];

    // 1. Relation with Category
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // 2. Relation with Brand
    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    // 3. Relation with Variants
    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    // 4. Relation with Thumbnail (This was missing)
    public function thumbnail()
    {
        return $this->belongsTo(MediaFile::class, 'thumbnail_id');
    }

    // 5. Accessor for Gallery Images URLs (for API response)
    // Returns array of full URLs for gallery images
    public function getGalleryImagesUrlsAttribute()
    {
        if (empty($this->gallery_images)) return [];

        $mediaFiles = MediaFile::whereIn('id', $this->gallery_images)->get();
        return $mediaFiles->map(function ($file) {
            return $file->full_url;
        })->toArray();
    }

    // 6. Accessor for Gallery Files (Optional Helper)
    // যেহেতু gallery_images একটি JSON কলাম (IDs), সরাসরি রিলেশন করা কঠিন।
    // তাই আমরা একটি Accessor বা Helper মেথড রাখতে পারি।
    public function getGalleryFilesAttribute()
    {
        if (empty($this->gallery_images)) return [];
        return MediaFile::whereIn('id', $this->gallery_images)->get();
    }

    // 7. Accessors for channel-specific names (no fallback - return null if not set)
    public function getRetailNameAttribute()
    {
        return $this->attributes['retail_name'] ?? null;
    }

    public function getWholesaleNameAttribute()
    {
        return $this->attributes['wholesale_name'] ?? null;
    }

    public function getCustomNameAttribute()
    {
        return $this->attributes['custom_name'] ?? null;
    }



    public function suppliers()
    {
        return $this->belongsToMany(Supplier::class, 'product_supplier')
                    ->withPivot('product_links', 'supplier_sku', 'cost_price')
                    ->withTimestamps();
    }

    // 6. Relation with Attributes (for additional product properties)
    public function attributes()
    {
        return $this->belongsToMany(Attribute::class, 'attribute_product')
                    ->withPivot('value', 'option_ids')
                    ->withTimestamps();
    }
}