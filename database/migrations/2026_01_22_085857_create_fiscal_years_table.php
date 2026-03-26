<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('fiscal_years', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->comment('e.g., FY 2025-2026');
            $table->date('start_date')->comment('Fiscal year start date');
            $table->date('end_date')->comment('Fiscal year end date');
            $table->boolean('is_active')->default(true)->comment('Whether this fiscal year is currently active');
            $table->boolean('is_closed')->default(false)->comment('Whether fiscal year is closed (no modifications allowed)');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['start_date', 'end_date']);
            $table->index('is_active');
            $table->index('is_closed');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('fiscal_years');
    }
};
