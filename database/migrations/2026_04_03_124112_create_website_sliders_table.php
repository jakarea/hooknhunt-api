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
        Schema::create('website_sliders', function (Blueprint $table) {
            $table->id();
            $table->enum('media_type', ['image', 'video'])->default('image');
            $table->string('image_url')->nullable();
            $table->string('video_url')->nullable();
            $table->string('capsule_title')->nullable();
            $table->string('title');
            $table->string('sub_title')->nullable();
            $table->text('features')->nullable();
            $table->string('cta1_label')->nullable();
            $table->string('cta1_link')->nullable();
            $table->string('cta2_label')->nullable();
            $table->string('cta2_link')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('website_sliders');
    }
};
