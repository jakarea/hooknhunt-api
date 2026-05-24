<?php

namespace App\Modules\Catalog\Events;

use App\Modules\Catalog\Models\Category;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * CategoryCreated Event
 *
 * Fired when a new category is created in the Catalog module.
 * Other modules can listen to this event to sync category data.
 */
class CategoryCreated
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var Category The category that was created
     */
    public Category $category;

    /**
     * Create a new event instance.
     */
    public function __construct(Category $category)
    {
        $this->category = $category;
    }

    /**
     * Get the category data as array (for easy consumption by listeners)
     */
    public function getCategoryData(): array
    {
        return [
            'id' => $this->category->id,
            'parent_id' => $this->category->parent_id,
            'name' => $this->category->name,
            'slug' => $this->category->slug,
            'description' => $this->category->description ?? null,
            'image_path' => $this->getCategoryImagePath(),
            'icon' => $this->category->icon ?? null,
            'position' => $this->category->position ?? 0,
            'is_active' => $this->category->is_active ?? true,
            'is_featured' => $this->category->is_featured ?? false,
            'show_in_menu' => $this->category->show_in_menu ?? true,
            'meta_title' => $this->category->meta_title ?? null,
            'meta_description' => $this->category->meta_description ?? null,
        ];
    }

    /**
     * Get category image path
     */
    protected function getCategoryImagePath(): ?string
    {
        // Check if category has a media relationship loaded
        if ($this->category->relationLoaded('media') && $this->category->media) {
            return $this->category->media->url ?? null;
        }

        // Fallback: check if category has image_id column
        if (isset($this->category->image_id) && $this->category->image_id) {
            // This would need to query the media table, but for independence
            // we should store the image path directly or make it null
            return null;
        }

        return null;
    }
}
