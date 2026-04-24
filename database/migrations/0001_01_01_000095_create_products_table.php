<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sort_order')->default(0); // For custom product sorting
            $table->string('name');
            $table->string('retail_name')->nullable();
            $table->string('retail_name_bn')->nullable();
            $table->string('wholesale_name')->nullable();
            $table->string('wholesale_name_bn')->nullable();
            $table->string('custom_name')->nullable();
            $table->string('slug')->unique();
            $table->foreignId('category_id')->constrained()->onDelete('restrict');
            $table->foreignId('brand_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('thumbnail_id')->nullable()->constrained('media_files')->onDelete('set null');
            $table->json('gallery_images')->nullable();
            $table->text('description')->nullable();
            $table->text('description_bn')->nullable();
            $table->text('short_description')->nullable();
            $table->string('video_url')->nullable();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->json('seo_tags')->nullable();
            $table->boolean('warranty_enabled')->nullable()->default(false);
            $table->text('warranty_details')->nullable();
            $table->json('highlights')->nullable();
            $table->json('highlights_bn')->nullable();
            $table->json('includes_in_box')->nullable();
            $table->string('includes_in_box_bn')->nullable();
            $table->string('cross_sale')->nullable();
            $table->string('up_sale')->nullable();
            $table->boolean('thank_you')->default(false);
            $table->boolean('hide')->default(false);
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
        });

        // Add FULLTEXT index on name column for better search performance
        DB::statement('ALTER TABLE products ADD FULLTEXT INDEX idx_name_search (name)');
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
