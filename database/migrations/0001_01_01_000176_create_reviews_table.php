<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create reviews table
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('screenshot_id')
                ->nullable()
                ->constrained('media_files')
                ->nullOnDelete()
                ->comment('Screenshot from media library');
            $table->text('review_text');
            $table->tinyInteger('rating')
                ->unsigned()
                ->comment('Rating from 1 to 5 stars');
            $table->boolean('is_featured')
                ->default(false)
                ->comment('Highlight on homepage/widgets');
            $table->unsignedInteger('sort_order')
                ->default(0)
                ->comment('Manual ordering for featured reviews');
            $table->timestamps();

            // Indexes for better query performance
            $table->index('rating');
            $table->index('is_featured');
            $table->index('sort_order');
            $table->index('created_at');
        });

        // Pivot table for many-to-many relationship with products
        Schema::create('review_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('review_id')
                ->constrained('reviews')
                ->cascadeOnDelete();
            $table->foreignId('product_id')
                ->constrained('products')
                ->cascadeOnDelete();
            $table->timestamps();

            // Prevent duplicate product assignments
            $table->unique(['review_id', 'product_id']);

            // Index for faster product-based queries
            $table->index('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('review_product');
        Schema::dropIfExists('reviews');
    }
};
