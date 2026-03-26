<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sold_by')->nullable()->constrained('users');
            $table->enum('channel', ['pos', 'retail_web', 'wholesale_web', 'daraz', 'app']);
            $table->enum('status', ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])->default('pending');
            $table->enum('payment_status', ['unpaid', 'paid', 'partial'])->default('unpaid');
            $table->decimal('sub_total', 12, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->string('coupon_code')->nullable();
            $table->decimal('delivery_charge', 8, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('total_profit', 12, 2)->default(0);
            $table->string('courier_tracking_id')->nullable();
            $table->string('external_order_id')->nullable()->index(); // Merged from external integrations
            $table->string('external_source')->nullable(); // Merged from external integrations
            $table->json('external_data')->nullable(); // Merged from external integrations
            $table->timestamp('shipped_at')->nullable();
            $table->decimal('due_amount', 10, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
