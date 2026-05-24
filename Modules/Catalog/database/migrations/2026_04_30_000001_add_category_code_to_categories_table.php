<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            // Add category_code column after sort_order
            // - nullable: allows existing categories to have NULL initially
            // - unique: ensures codes are globally unique
            // - default NULL: existing categories will need manual update
            $table->integer('category_code')->nullable()->unique()->after('sort_order')->default(null);
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('category_code');
        });
    }
};
