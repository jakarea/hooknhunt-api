<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courier_zone_rates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('courier_id')->constrained('couriers')->onDelete('cascade');
            $table->string('zone_name');
            $table->decimal('base_charge', 8, 2);
            $table->decimal('base_weight_kg', 8, 2)->default(1);
            $table->decimal('extra_charge_per_kg', 8, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courier_zone_rates');
    }
};
