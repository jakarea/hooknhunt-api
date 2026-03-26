<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('retail_name')->nullable();
            $table->string('wholesale_name')->nullable();
            $table->string('custom_name')->nullable();
            $table->string('slug')->unique();
            $table->foreignId('category_id')->constrained()->onDelete('restrict');
            $table->foreignId('brand_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('thumbnail_id')->nullable()->constrained('media_files')->onDelete('set null');
            $table->json('gallery_images')->nullable();
            $table->text('description')->nullable();
            $table->text('short_description')->nullable();
            $table->string('video_url')->nullable();
            $table->string('seo_title')->nullable();
            $table->text('seo_description')->nullable();
            $table->json('seo_tags')->nullable();
            $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
