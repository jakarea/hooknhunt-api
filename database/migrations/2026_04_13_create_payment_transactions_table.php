<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();

            // Order & Customer references
            $table->foreignId('sales_order_id')->constrained('sales_orders')->onDelete('cascade');
            $table->foreignId('customer_id')->constrained('customers')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');

            // Gateway information
            $table->string('gateway')->default('sslcommerz'); // sslcommerz, bkash, nagad, etc.
            $table->string('gateway_tran_id')->nullable()->index(); // Transaction ID from gateway

            // Payment details
            $table->decimal('amount', 12, 2)->notNull();
            $table->string('currency', 3)->default('BDT');
            $table->enum('status', ['pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded'])->default('pending')->index();

            // Payment method (what customer selected)
            $table->string('payment_method')->nullable(); // card, bkash, nagad, mobile_banking, etc.

            // EMI details
            $table->string('emi_bank')->nullable(); // Bank name for EMI
            $table->unsignedInteger('emi_tenure')->nullable(); // 3, 6, 9, 12, 18, 24 months

            // Customer details (for SSL Commerz)
            $table->string('customer_name')->notNull();
            $table->string('customer_email')->nullable();
            $table->string('customer_phone', 20)->notNull();
            $table->json('customer_address')->nullable(); // Store full address for gateway

            // Gateway response
            $table->json('gateway_response')->nullable(); // Full response from gateway
            $table->text('failed_reason')->nullable();

            // Timestamps
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();

            // Refund details
            $table->decimal('refund_amount', 12, 2)->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('refund_tran_id')->nullable();
            $table->text('refund_reason')->nullable();

            // Metadata
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['gateway', 'status']);
            $table->index(['customer_id', 'status']);
            $table->index(['created_at', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
