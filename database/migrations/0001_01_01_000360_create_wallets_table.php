<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained('users')->onDelete('cascade');
            $table->decimal('balance', 10, 2)->default(0.00);
            $table->decimal('total_credited', 12, 2)->default(0.00);
            $table->decimal('total_debited', 12, 2)->default(0.00);
            $table->boolean('is_active')->default(true);
            $table->boolean('is_frozen')->default(false);
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
            $table->index('balance');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallets');
    }
};
