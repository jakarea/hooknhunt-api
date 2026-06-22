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
        // Convert existing data to proper JSON before changing column type
        DB::statement("UPDATE `products` SET `includes_in_box_bn` = NULL WHERE `includes_in_box_bn` = '' OR `includes_in_box_bn` IS NULL");
        
        // Change column type from varchar(255) to json
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
            // Revert back to varchar type
            $table->string('includes_in_box_bn')->nullable()->change();
        });
    }
};
