<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained('shipments')->onDelete('cascade');
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('restrict');
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->integer('ordered_qty');
            $table->integer('received_qty')->default(0);
            $table->integer('lost_qty')->default(0);
            $table->boolean('is_sorted')->default(false);
            $table->boolean('is_lost')->default(false);
            $table->decimal('unit_price_rmb', 10, 2);
            $table->decimal('shipping_cost_actual', 10, 2)->default(0);
            $table->decimal('extra_weight_charge', 10, 2)->default(0);
            $table->decimal('calculated_landed_cost', 15, 2)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipment_items');
    }
};
