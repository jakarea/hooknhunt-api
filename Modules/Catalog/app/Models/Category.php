<?php

namespace App\Modules\Catalog\Models;

use App\Modules\Catalog\Events\CategoryCreated;
use App\Modules\Catalog\Events\CategoryDeleted;
use App\Modules\Catalog\Events\CategoryUpdated;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;

class Category extends Model
{
    // NOTE: Removed automatic appends to prevent memory exhaustion
    // The 'childrenCount' accessor is lightweight but adds overhead during serialization
    // Use $category->append('childrenCount') when explicitly needed
    // protected $appends = ['childrenCount'];

    protected $fillable = [
        'name',
        'slug',
        'parent_id',
        'image_id',
        'is_active',
        'sort_order',
        'category_code',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Boot method to register model events
     */
    protected static function boot()
    {
        parent::boot();

        // Fire events for inter-module communication
        static::created(function ($category) {
            CategoryCreated::dispatch($category);
        });

        static::updated(function ($category) {
            CategoryUpdated::dispatch($category);
        });

        static::deleted(function ($category) {
            CategoryDeleted::dispatch($category->id, $category->slug);
        });
    }

    // Relation: Parent Category
    public function parent()
    {
        return $this->belongsTo(Category::class, 'parent_id');
    }

    // Relation: Sub Categories (Recursive)
    public function children()
    {
        return $this->hasMany(Category::class, 'parent_id');
    }

    // Image relationship removed (MediaFile is in CMS/Core module - breaks independence)
    // Use image_id directly or API calls to CMS module
    // public function image()
    // {
    //     return $this->belongsTo(MediaFile::class, 'image_id');
    // }

    // Relation: Products
    public function products()
    {
        return $this->hasMany(Product::class);
    }

    /**
     * Check if category code can be updated
     * Only allow if currently NULL or being set for the first time
     */
    public function canUpdateCode(): bool
    {
        return $this->category_code === null;
    }

    /**
     * Check if category code is valid format (ends with 000)
     */
    public function isValidCodeFormat(int $code): bool
    {
        // Must be 4 digits, first digit 1-9, last 3 digits must be 000
        return $code >= 1000 && $code <= 9999 && ($code % 1000 === 0);
    }

    /**
     * Accessor for children count (camelCase for frontend compatibility)
     */
    public function getChildrenCountAttribute(): int
    {
        return (int) ($this->attributes['children_count'] ?? 0);
    }
}