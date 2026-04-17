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
        // First, convert existing empty strings to null or valid JSON
        DB::statement("UPDATE `products` SET `includes_in_box_bn` = NULL WHERE `includes_in_box_bn` = '' OR `includes_in_box_bn` IS NULL");
        DB::statement("UPDATE `products` SET `includes_in_box_bn` = '[]' WHERE `includes_in_box_bn` IS NOT NULL AND `includes_in_box_bn` != '' AND JSON_VALID(`includes_in_box_bn`) = 0");

        // Now change the column type to json
        Schema::table('products', function (Blueprint $table) {
            $table->json('includes_in_box_bn')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Revert back to string type
            $table->string('includes_in_box_bn')->nullable()->change();
        });
    }
};
