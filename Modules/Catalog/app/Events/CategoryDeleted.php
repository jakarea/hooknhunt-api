<?php

namespace App\Modules\Catalog\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * CategoryDeleted Event
 *
 * Fired when a category is deleted in the Catalog module.
 * Other modules can listen to this event to remove synced category data.
 */
class CategoryDeleted
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @var int The ID of the category that was deleted
     */
    public int $categoryId;

    /**
     * @var string|null The slug of the category (for reference)
     */
    public ?string $categorySlug;

    /**
     * Create a new event instance.
     */
    public function __construct(int $categoryId, ?string $categorySlug = null)
    {
        $this->categoryId = $categoryId;
        $this->categorySlug = $categorySlug;
    }

    /**
     * Get the category ID
     */
    public function getCategoryId(): int
    {
        return $this->categoryId;
    }
}
