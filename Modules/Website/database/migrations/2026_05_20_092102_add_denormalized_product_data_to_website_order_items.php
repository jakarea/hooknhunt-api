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
        Schema::table('sales_order_items', function (Blueprint $table) {
            // Product data (duplicated from Catalog for module independence)
            $table->string('product_name')->nullable()->after('product_variant_id')->comment('Duplicated from Catalog.product');
            $table->string('product_sku')->nullable()->after('product_name')->comment('Duplicated from Catalog.product_variant');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropColumn(['product_name', 'product_sku']);
        });
    }
};
