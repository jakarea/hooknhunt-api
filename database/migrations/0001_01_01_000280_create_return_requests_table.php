<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_requests', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_no')->unique();
            $table->foreignId('customer_id')->constrained('customers');
            $table->foreignId('sales_order_id')->constrained('sales_orders');
            $table->enum('reason', ['defective', 'wrong_item', 'size_issue', 'change_mind', 'other']);
            $table->text('details')->nullable();
            $table->json('images')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'completed'])->default('pending');
            $table->enum('refund_method', ['wallet', 'bank', 'exchange', 'no_refund'])->default('wallet');
            $table->text('admin_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_requests');
    }
};
