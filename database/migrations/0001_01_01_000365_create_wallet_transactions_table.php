<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained('wallets')->onDelete('cascade');
            $table->enum('type', ['credit', 'debit']);
            $table->decimal('amount', 10, 2);
            $table->decimal('balance_before', 10, 2);
            $table->decimal('balance_after', 10, 2);
            $table->enum('source_type', ['order', 'refund', 'adjustment', 'transfer', 'conversion', 'loyalty_redemption']);
            $table->BigInteger('source_id')->nullable();
            $table->string('description');
            $table->foreignId('created_by')->nullable();
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
            $table->index(['wallet_id', 'type']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
