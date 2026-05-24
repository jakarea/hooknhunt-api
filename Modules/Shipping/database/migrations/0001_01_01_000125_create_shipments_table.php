<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('restrict');
            $table->string('po_number')->nullable()->unique();
            $table->string('lot_number')->nullable();
            $table->enum('status', ['draft', 'payment_confirmed', 'shipped_from_china', 'warehouse_china', 'shipped_to_bd', 'customs_clearing', 'received_bogura', 'completed'])->default('draft');
            $table->decimal('exchange_rate', 10, 4)->default(1);
            $table->decimal('total_china_cost_rmb', 15, 2)->default(0);
            $table->decimal('total_weight_actual', 10, 2)->nullable();
            $table->decimal('total_weight_chargeable', 10, 2)->nullable();
            $table->decimal('shipping_cost_intl', 15, 2)->default(0);
            $table->decimal('shipping_cost_local', 15, 2)->default(0);
            $table->decimal('misc_cost', 15, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shipments');
    }
};
