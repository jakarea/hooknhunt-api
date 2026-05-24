<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_affiliate_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->foreignId('affiliate_id')->nullable()->constrained('affiliates')->onDelete('cascade');
            $table->decimal('commission_rate', 5, 2)->default(5.00)->comment('Commission percentage (e.g., 5.00 = 5%)');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Index for fast lookups
            $table->index(['product_id', 'affiliate_id'], 'idx_product_affiliate');
            $table->index('affiliate_id');

            // Unique constraint: One rate per product-affiliate combination
            $table->unique(['product_id', 'affiliate_id'], 'unique_product_affiliate');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_affiliate_commissions');
    }
};
