<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Builder;

/**
 * Review Model
 *
 * @property int $id
 * @property int|null $screenshot_id
 * @property string $review_text
 * @property int $rating
 * @property bool $is_featured
 * @property int $sort_order
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read \App\Models\MediaFile|null $screenshot
 * @property-read \Illuminate\Database\Eloquent\Collection<int, \App\Models\Product> $products
 */
class Review extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'screenshot_id',
        'review_text',
        'rating',
        'is_featured',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'rating' => 'integer',
        'is_featured' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * The accessors to append to the model's array form.
     *
     * @var array<int, string>
     */
    protected $appends = [];

    /**
     * Get the screenshot associated with the review.
     */

    /**
     * Get the screenshot associated with the review.
     */
    public function screenshot(): BelongsTo
    {
        return $this->belongsTo(MediaFile::class, 'screenshot_id');
    }

    /**
     * Get the products associated with the review.
     */
    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'review_product')
            ->withTimestamps()
            ->orderBy('sort_order');
    }

    /**
     * Scope a query to only include featured reviews.
     */
    public function scopeFeatured($query)
    {
        return $query->where('is_featured', true)
            ->orderBy('sort_order');
    }

    /**
     * Scope a query to filter by minimum rating.
     */
    public function scopeMinRating($query, int $rating)
    {
        return $query->where('rating', '>=', $rating);
    }

    /**
     * Scope a query to filter by exact rating.
     */
    public function scopeWithRating($query, int $rating)
    {
        return $query->where('rating', $rating);
    }

    /**
     * Scope a query to filter by product.
     */
    public function scopeForProduct($query, int $productId)
    {
        return $query->whereHas('products', function ($q) use ($productId) {
            $q->where('products.id', $productId);
        });
    }

    /**
     * Scope a query to order by latest.
     */
    public function scopeLatest($query)
    {
        return $query->orderBy('created_at', 'desc');
    }
}
