<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_item_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_item_id')->constrained('sales_order_items')->onDelete('cascade');
            $table->foreignId('inventory_batch_id')->constrained('inventory_batches');
            $table->integer('qty_deducted');
            $table->decimal('cost_per_unit', 10, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_item_allocations');
    }
};
