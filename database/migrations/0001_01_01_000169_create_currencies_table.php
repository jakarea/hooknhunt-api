<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $table) {
            $table->id();

            // Currency Details
            $table->string('code', 3)->unique()->comment('Currency code (e.g., USD, EUR, BDT)');
            $table->string('name')->comment('Currency name (e.g., US Dollar, Euro, Bangladeshi Taka)');
            $table->char('symbol', 10)->comment('Currency symbol (e.g., $, €, ৳)');
            $table->string('symbol_position')->default('left')->comment('Symbol position: left or right of amount');

            // Formatting
            $table->integer('decimal_places')->default(2)->comment('Number of decimal places (usually 2)');

            // Default Currency
            $table->boolean('is_default')->default(false)->comment('Is this the system default currency?');

            // Exchange Rate (to default currency)
            $table->decimal('exchange_rate', 15, 6)->nullable()->default(1)->comment('Exchange rate to default currency');

            // Status
            $table->boolean('is_active')->default(true)->comment('Is this currency active?');

            // Notes
            $table->text('notes')->nullable()->comment('Additional notes');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index('code');
            $table->index('is_default');
            $table->index('is_active');
        });

        // Insert default currencies
        DB::table('currencies')->insert([
            [
                'code' => 'BDT',
                'name' => 'Bangladeshi Taka',
                'symbol' => '৳',
                'symbol_position' => 'left',
                'decimal_places' => 2,
                'is_default' => true,
                'exchange_rate' => 1.000000,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('currencies');
    }
};
