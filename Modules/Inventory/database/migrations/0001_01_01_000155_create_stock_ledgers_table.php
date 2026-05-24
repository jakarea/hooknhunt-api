<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_variant_id')->constrained('product_variants')->onDelete('restrict');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('restrict');
            $table->foreignId('inventory_batch_id')->nullable()->constrained('inventory_batches')->onDelete('cascade');
            $table->enum('type', ['purchase_in', 'sale_out', 'return_in', 'return_out', 'transfer', 'adjustment', 'opening_stock']);
            $table->integer('qty_change');
            $table->nullableMorphs('reference');
            $table->timestamp('date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_ledgers');
    }
};
