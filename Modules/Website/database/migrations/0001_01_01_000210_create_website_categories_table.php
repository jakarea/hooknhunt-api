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
        Schema::create('website_categories', function (Blueprint $table) {
            $table->id();

            // Reference to Catalog module category (for sync purposes)
            $table->unsignedBigInteger('catalog_category_id')->nullable()->index();

            // Self-referencing relationship for hierarchy
            $table->unsignedBigInteger('parent_id')->nullable()->index();
            $table->foreign('parent_id')->references('id')->on('website_categories')->onDelete('cascade');

            // Category basic information (denormalized from Catalog)
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();

            // Media (denormalized from Catalog)
            $table->string('image_path')->nullable();
            $table->string('icon')->nullable();

            // Organization (denormalized from Catalog)
            $table->unsignedInteger('position')->default(0);

            // Display flags (denormalized from Catalog)
            $table->boolean('is_active')->default(true);
            $table->boolean('is_featured')->default(false);
            $table->boolean('show_in_menu')->default(true);

            // SEO (denormalized from Catalog)
            $table->string('meta_title')->nullable();
            $table->text('meta_description')->nullable();

            // Sync tracking
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Indexes for performance
            $table->index(['is_active', 'position']);
            $table->index('slug');
            $table->index('synced_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_categories');
    }
};
