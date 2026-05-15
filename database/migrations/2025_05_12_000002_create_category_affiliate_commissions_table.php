<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('category_affiliate_commissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->foreignId('affiliate_id')->nullable()->constrained('affiliates')->onDelete('cascade');
            $table->decimal('commission_rate', 5, 2)->default(5.00)->comment('Commission percentage (e.g., 3.00 = 3%)');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Index for fast lookups
            $table->index(['category_id', 'affiliate_id'], 'idx_category_affiliate');
            $table->index('affiliate_id');

            // Unique constraint: One rate per category-affiliate combination
            $table->unique(['category_id', 'affiliate_id'], 'unique_category_affiliate');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('category_affiliate_commissions');
    }
};
