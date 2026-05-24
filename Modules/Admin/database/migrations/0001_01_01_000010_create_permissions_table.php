<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permissions', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('key')->nullable(); // Merged from modification
            $table->string('group_name');
            $table->string('module_name')->nullable(); // Merged from modification
            $table->timestamps();

            // Merged indexes from modification
            $table->index('key');
            $table->index(['group_name', 'module_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permissions');
    }
};
