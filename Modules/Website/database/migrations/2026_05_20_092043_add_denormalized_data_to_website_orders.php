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
        Schema::table('sales_orders', function (Blueprint $table) {
            // Customer data columns - Already exist! No need to add
            // customer_name, customer_email, customer_phone are already present

            // Shipping address data (duplicated from Core.addresses for module independence)
            $table->string('shipping_name')->nullable()->after('courier_tracking_id')->comment('Duplicated from Core.addresses');
            $table->text('shipping_address')->nullable()->after('shipping_name')->comment('Duplicated from Core.addresses');
            $table->string('shipping_city')->nullable()->after('shipping_address')->comment('Duplicated from Core.addresses');
            $table->string('shipping_country')->nullable()->after('shipping_city')->comment('Duplicated from Core.addresses');

            // User reference (Core dependency only - acceptable)
            if (!Schema::hasColumn('sales_orders', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('customer_id')->comment('Reference to Core.users (only Core dependency)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropColumn([
                'customer_name',
                'customer_email',
                'customer_phone',
                'shipping_name',
                'shipping_address',
                'shipping_city',
                'shipping_country',
                'user_id'
            ]);
        });
    }
};
