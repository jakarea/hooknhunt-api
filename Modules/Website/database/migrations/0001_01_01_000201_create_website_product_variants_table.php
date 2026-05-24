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
        Schema::create('website_product_variants', function (Blueprint $table) {
            $table->id();

            // Reference to Catalog module variant (for sync purposes)
            $table->unsignedBigInteger('catalog_variant_id')->nullable()->index();

            // Reference to local website product
            $table->unsignedBigInteger('product_id');
            $table->foreign('product_id')->references('id')->on('website_products')->onDelete('cascade');

            // Variant information (denormalized from Catalog)
            $table->string('variant_name')->nullable();
            $table->string('variant_slug')->nullable();
            $table->string('sku')->nullable();
            $table->string('custom_sku')->nullable();

            // Pricing (denormalized from Catalog)
            $table->decimal('price', 10, 2)->nullable();
            $table->decimal('offer_price', 10, 2)->nullable();
            $table->decimal('purchase_cost', 10, 2)->nullable();

            // Inventory (denormalized from Catalog)
            $table->decimal('weight', 8, 2)->nullable();
            $table->unsignedInteger('stock')->default(0);

            // Media (denormalized from Catalog)
            $table->string('thumbnail_path')->nullable();

            // Variant settings (denormalized from Catalog)
            $table->boolean('is_active')->default(true);
            $table->boolean('allow_preorder')->default(false);
            $table->date('expected_delivery')->nullable();
            $table->unsignedInteger('moq')->nullable();

            // Channel information
            $table->string('channel')->default('retail');

            // Sync tracking
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['product_id', 'is_active']);
            $table->index('sku');
            $table->index('channel');
            $table->index('synced_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_product_variants');
    }
};
