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
        Schema::create('catalog_product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('url', 500);
            $table->string('file_name', 255)->nullable();
            $table->string('original_filename', 255)->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('disk', 50)->default('local');
            $table->string('path', 500)->nullable();
            $table->boolean('is_thumbnail')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('alt_text', 255)->nullable();
            $table->timestamps();

            // Indexes for performance
            $table->index(['product_id', 'is_thumbnail']);
            $table->index('product_id');
            $table->index('is_thumbnail');
            $table->index('sort_order');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('catalog_product_images');
    }
};
