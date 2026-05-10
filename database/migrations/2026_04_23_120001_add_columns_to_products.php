<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Add sort_order column for custom product sorting
            if (!Schema::hasColumn('products', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('id');
            }
        });

        // Add FULLTEXT index on name column for better search performance
        DB::statement('ALTER TABLE products ADD FULLTEXT INDEX idx_name_search (name)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop FULLTEXT index first
        DB::statement('ALTER TABLE products DROP INDEX idx_name_search');

        // Then drop the column
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
