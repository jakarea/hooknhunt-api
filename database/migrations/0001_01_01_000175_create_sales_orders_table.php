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
            $table->enum('status', ['pending', 'draft', 'processing', 'on_hold', 'approved', 'on_shipping', 'shipped', 'delivered', 'completed', 'cancelled', 'returned', 'refunded', 'sent_to_steadfast', 'in_review', 'in_transit', 'delivered_payment_review', 'partial_delivered', 'delivery_failed_return', 'return_received', 'refunded_completed'])->default('pending');
            $table->enum('cancellation_reason', ['customer', 'admin', 'courier', 'system'])->nullable();
            $table->text('cancellation_detail')->nullable();
            $table->enum('payment_status', ['unpaid', 'paid', 'partial'])->default('unpaid');
            $table->decimal('sub_total', 12, 2);
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->string('coupon_code')->nullable();
            $table->decimal('delivery_charge', 8, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->decimal('paid_amount', 12, 2)->default(0);
            $table->decimal('total_profit', 12, 2)->default(0);
            $table->decimal('total_weight', 10, 2)->default(0);
            $table->string('courier_tracking_id')->nullable();
            $table->string('consignment_id')->nullable();
            $table->string('tracking_code')->nullable();
            $table->string('tracking_link')->nullable(); // Steadfast courier tracking link
            $table->boolean('sent_to_courier')->default(false);
            $table->string('delivery_status')->nullable();
            $table->string('external_order_id')->nullable()->index();
            $table->string('external_source')->nullable();
            $table->json('external_data')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->boolean('editing_locked')->default(false);
            $table->decimal('due_amount', 10, 2)->default(0);
            $table->text('note')->nullable();
            $table->timestamps();
            $table->timestamp('webhook_received_at')->nullable();
            $table->json('courier_webhook_data')->nullable();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sales_orders');
    }
};
