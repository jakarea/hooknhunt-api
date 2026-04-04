<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('discounts', function (Blueprint $table) {
            $table->text('description')->nullable()->after('code');
            $table->decimal('max_discount_amount', 10, 2)->nullable()->after('amount');
            $table->decimal('min_order_amount', 10, 2)->nullable()->default(0)->after('max_discount_amount');
            $table->integer('usage_limit_per_customer')->nullable()->default(1)->after('max_uses');
            $table->boolean('is_auto_apply')->default(false)->after('is_active');
            $table->boolean('first_purchase_only')->default(false)->after('is_auto_apply');
            $table->json('product_ids')->nullable()->after('first_purchase_only');
            $table->json('category_ids')->nullable()->after('product_ids');
            $table->json('customer_ids')->nullable()->after('category_ids');
        });
    }

    public function down(): void
    {
        Schema::table('discounts', function (Blueprint $table) {
            $table->dropColumn([
                'description',
                'max_discount_amount',
                'min_order_amount',
                'usage_limit_per_customer',
                'is_auto_apply',
                'first_purchase_only',
                'product_ids',
                'category_ids',
                'customer_ids',
            ]);
        });
    }
};
