<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('product_id')->nullable();
            $table->foreignId('product_variant_id')->nullable()->constrained('product_variants')->onDelete('restrict');
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->onDelete('restrict');
            $table->foreign('product_id')->references('id')->on('products')->onDelete('cascade');
            $table->string('batch_no')->index();
            $table->decimal('cost_price', 15, 2);
            $table->integer('initial_qty');
            $table->integer('remaining_qty');
            $table->date('manufacturing_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->timestamps();
            $table->index(['product_variant_id', 'remaining_qty']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
    }
};
