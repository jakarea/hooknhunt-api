<?php

namespace App\Modules\Website\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * WebsiteCategory - Denormalized category data for Website module independence
 *
 * This model stores a copy of essential category data from the Catalog module,
 * allowing the Website module to display categories without direct Catalog dependency.
 *
 * Data synchronization happens via event listeners:
 * - Catalog\CategoryCreated → WebsiteCategory created
 * - Catalog\CategoryUpdated → WebsiteCategory updated
 * - Catalog\CategoryDeleted → WebsiteCategory soft-deleted
 */
class WebsiteCategory extends Model
{
    use HasFactory;

    protected $table = 'website_categories';

    protected $guarded = ['id'];

    /**
     * Casts for automatic type conversion
     */
    protected $casts = [
        'parent_id' => 'integer',
        'position' => 'integer',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
        'show_in_menu' => 'boolean',
        'synced_at' => 'datetime',
    ];

    /**
     * Appends for frontend compatibility
     */
    protected $appends = ['image_url', 'has_children'];

    /**
     * Relationship with parent category
     */
    public function parent()
    {
        return $this->belongsTo(WebsiteCategory::class, 'parent_id');
    }

    /**
     * Relationship with child categories
     */
    public function children()
    {
        return $this->hasMany(WebsiteCategory::class, 'parent_id')->orderBy('position');
    }

    /**
     * Relationship with website products (if needed)
     */
    public function products(): HasMany
    {
        return $this->hasMany(WebsiteProduct::class, 'category_id');
    }

    /**
     * Scope to get only active categories
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get only featured categories
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true);
    }

    /**
     * Scope to get root categories (no parent)
     */
    public function scopeRoot($query)
    {
        return $query->whereNull('parent_id');
    }

    /**
     * Get image URL attribute
     */
    public function getImageUrlAttribute(): ?string
    {
        return $this->image_path;
    }

    /**
     * Check if category has children
     */
    public function getHasChildrenAttribute(): bool
    {
        return $this->children()->count() > 0;
    }

    /**
     * Sync category data from Catalog module
     */
    public function syncFromCatalog(array $catalogCategoryData): self
    {
        return $this->update([
            'catalog_category_id' => $catalogCategoryData['id'],
            'parent_id' => $catalogCategoryData['parent_id'] ?? null,
            'name' => $catalogCategoryData['name'],
            'slug' => $catalogCategoryData['slug'],
            'description' => $catalogCategoryData['description'] ?? null,
            'image_path' => $catalogCategoryData['image_path'] ?? null,
            'icon' => $catalogCategoryData['icon'] ?? null,
            'position' => $catalogCategoryData['position'] ?? 0,
            'is_active' => $catalogCategoryData['is_active'] ?? true,
            'is_featured' => $catalogCategoryData['is_featured'] ?? false,
            'show_in_menu' => $catalogCategoryData['show_in_menu'] ?? true,
            'meta_title' => $catalogCategoryData['meta_title'] ?? null,
            'meta_description' => $catalogCategoryData['meta_description'] ?? null,
            'synced_at' => now(),
        ]);
    }

    /**
     * Create WebsiteCategory from Catalog category data
     */
    public static function createFromCatalog(array $catalogCategoryData): self
    {
        return self::create([
            'catalog_category_id' => $catalogCategoryData['id'],
            'parent_id' => $catalogCategoryData['parent_id'] ?? null,
            'name' => $catalogCategoryData['name'],
            'slug' => $catalogCategoryData['slug'],
            'description' => $catalogCategoryData['description'] ?? null,
            'image_path' => $catalogCategoryData['image_path'] ?? null,
            'icon' => $catalogCategoryData['icon'] ?? null,
            'position' => $catalogCategoryData['position'] ?? 0,
            'is_active' => $catalogCategoryData['is_active'] ?? true,
            'is_featured' => $catalogCategoryData['is_featured'] ?? false,
            'show_in_menu' => $catalogCategoryData['show_in_menu'] ?? true,
            'meta_title' => $catalogCategoryData['meta_title'] ?? null,
            'meta_description' => $catalogCategoryData['meta_description'] ?? null,
            'is_active' => true,
            'synced_at' => now(),
        ]);
    }
}
