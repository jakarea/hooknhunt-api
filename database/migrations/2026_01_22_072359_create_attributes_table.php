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
        Schema::create('attributes', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., 'warranty', 'origin', 'certification'
            $table->string('display_name'); // e.g., 'Warranty Period', 'Country of Origin'
            $table->enum('type', ['text', 'number', 'select', 'multiselect', 'color', 'date', 'boolean'])->default('text');
            $table->boolean('is_required')->default(false);
            $table->boolean('is_visible')->default(true); // Show on storefront
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attributes');
    }
};
