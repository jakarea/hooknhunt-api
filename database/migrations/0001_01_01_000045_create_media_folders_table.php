<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media_folders', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->index();
            $table->boolean('is_public')->default(false);
            $table->text('description')->nullable();
            $table->integer('sort_order')->default(0);
            $table->json('allowed_roles')->nullable();
            $table->json('view_roles')->nullable();
            $table->json('edit_roles')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('media_folders')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_folders');
    }
};


// ALTER TABLE `media_folders`
//     ADD COLUMN `is_public` TINYINT(1) NOT NULL DEFAULT 0 AFTER `slug`,
//     ADD COLUMN `description` TEXT NULL AFTER `is_public`,
//     ADD COLUMN `sort_order` INT NOT NULL DEFAULT 0 AFTER `description`,
//     ADD COLUMN `allowed_roles` JSON NULL AFTER `sort_order`,
//     ADD COLUMN `view_roles` JSON NULL AFTER `allowed_roles`,
//     ADD COLUMN `edit_roles` JSON NULL AFTER `view_roles`;
