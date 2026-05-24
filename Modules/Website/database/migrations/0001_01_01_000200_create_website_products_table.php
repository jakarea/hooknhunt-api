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
        Schema::create('website_products', function (Blueprint $table) {
            $table->id();

            // Reference to Catalog module product (for sync purposes)
            $table->unsignedBigInteger('catalog_product_id')->nullable()->index();

            // Product basic information (denormalized from Catalog)
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('sku')->nullable()->unique();
            $table->text('description')->nullable();

            // Pricing (denormalized from Catalog)
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('compare_at_price', 10, 2)->nullable();
            $table->decimal('cost_price', 10, 2)->nullable();

            // Inventory (denormalized from Catalog)
            $table->decimal('weight', 8, 2)->nullable();
            $table->unsignedInteger('stock')->default(0);

            // Media (denormalized from Catalog)
            $table->string('thumbnail_path')->nullable();
            $table->json('gallery_images')->nullable();

            // Category (denormalized from Catalog)
            $table->unsignedBigInteger('category_id')->nullable();
            $table->string('category_name')->nullable();
            $table->string('category_slug')->nullable();

            // Brand (denormalized from Catalog)
            $table->unsignedBigInteger('brand_id')->nullable();
            $table->string('brand_name')->nullable();
            $table->string('brand_slug')->nullable();

            // Product features (denormalized from Catalog)
            $table->json('highlights')->nullable();
            $table->json('attributes')->nullable();

            // SEO (denormalized from Catalog)
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->boolean('seo_enabled')->default(false);

            // Status flags
            $table->boolean('is_published')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('has_variants')->default(false);
            $table->unsignedInteger('variant_count')->default(0);

            // Sync tracking
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['is_published', 'is_active']);
            $table->index('slug');
            $table->index('sku');
            $table->index('category_id');
            $table->index('brand_id');
            $table->index('synced_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_products');
    }
};
