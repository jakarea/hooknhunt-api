<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('affiliate_referrals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('affiliate_id')->constrained('affiliates')->onDelete('cascade');
            $table->string('referral_code', 50)->index();
            $table->string('ip_address', 45)->nullable()->comment('Visitor IP address');
            $table->string('user_agent', 500)->nullable()->comment('Browser user agent');
            $table->string('landing_page', 500)->nullable()->comment('First page visited');
            $table->timestamp('clicked_at')->useCurrent();
            $table->timestamp('converted_at')->nullable()->comment('When first order was placed');
            $table->foreignId('sales_order_id')->nullable()->constrained('sales_orders')->onDelete('set null');
            $table->decimal('order_amount', 12, 2)->nullable()->comment('Order total amount');
            $table->decimal('commission_amount', 10, 2)->nullable()->comment('Commission earned from this referral');
            $table->enum('status', ['clicked', 'converted', 'cancelled'])->default('clicked');
            $table->timestamps();

            // Indexes for analytics
            $table->index('affiliate_id');
            $table->index('referral_code');
            $table->index('status');
            $table->index('clicked_at');
            $table->index('converted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('affiliate_referrals');
    }
};
