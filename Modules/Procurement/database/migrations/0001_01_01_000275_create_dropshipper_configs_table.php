<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dropshipper_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('store_name')->nullable();
            $table->string('store_url')->nullable();
            $table->string('logo_url')->nullable();
            $table->decimal('default_profit_margin', 5, 2)->default(0);
            $table->string('api_key')->unique()->nullable();
            $table->boolean('auto_sync_products')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dropshipper_configs');
    }
};
