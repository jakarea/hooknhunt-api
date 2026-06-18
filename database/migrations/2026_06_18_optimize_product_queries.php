<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add indexes to products table for faster queries
        Schema::table('products', function (Blueprint $table) {
            // Index for status filtering
            $table->index('status');
            
            // Index for category filtering
            $table->index('category_id');
            
            // Index for brand filtering
            $table->index('brand_id');
            
            // Index for name searching (partial index would be better but MySQL doesn't support it easily)
            $table->fullText('name');
            
            // Index for sort order
            $table->index('sort_order');
            
            // Composite index for common queries (status + created_at)
            $table->index(['status', 'created_at']);
        });

        // Add indexes to product_variants table for faster stock queries
        Schema::table('product_variants', function (Blueprint $table) {
            // Index for product lookup
            $table->index('product_id');
            
            // Index for stock queries
            $table->index('stock');
        });
    }

    public function rollback(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_status_index');
            $table->dropIndex('products_category_id_index');
            $table->dropIndex('products_brand_id_index');
            $table->dropIndex('products_name_fulltext');
            $table->dropIndex('products_sort_order_index');
            $table->dropIndex('products_status_created_at_index');
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropIndex('product_variants_product_id_index');
            $table->dropIndex('product_variants_stock_index');
        });
    }
};
