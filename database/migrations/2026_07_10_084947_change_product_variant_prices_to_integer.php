<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Convert price fields from decimal(15,2) to integer
     * Per user requirement: prices should be integers with no fractions
     */
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->integer('price')->change();
            $table->integer('offer_price')->change();
            $table->integer('purchase_cost')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('price', 15, 2)->change();
            $table->decimal('offer_price', 15, 2)->change();
            $table->decimal('purchase_cost', 15, 2)->change();
        });
    }
};
