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
        // Associate review ID 5 with product ID 290 for testing
        DB::table('review_product')->insert([
            'review_id' => 5,
            'product_id' => 290,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('review_product')
            ->where('review_id', 5)
            ->where('product_id', 290)
            ->delete();
    }
};
