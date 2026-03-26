<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();

            // Wallet fields (added 2026-02-19)
            $table->decimal('wallet_balance', 10, 2)->default(0)->after('id'); // Tracks credit/debit in BDT
            $table->decimal('credit_limit', 10, 2)->default(0)->after('wallet_balance'); // Maximum negative balance
            $table->text('wallet_notes')->nullable()->after('credit_limit'); // Transaction history (JSON)

            // Basic information
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('whatsapp')->nullable();
            $table->string('shop_url')->nullable();
            $table->string('shop_name')->nullable();
            $table->string('contact_person')->nullable();
            $table->string('phone')->nullable();

            // WeChat payment info
            $table->string('wechat_id')->nullable();
            $table->string('wechat_qr_file')->nullable();
            $table->string('wechat_qr_url')->nullable();

            // Alipay payment info
            $table->string('alipay_id')->nullable();
            $table->string('alipay_qr_file')->nullable();
            $table->string('alipay_qr_url')->nullable();

            // Additional info
            $table->text('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('suppliers');
    }
};
