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
        Schema::create('financial_reports', function (Blueprint $table) {
            $table->id();

            // Report Information
            $table->string('name')->comment('Report name');
            $table->string('type')->comment('Report type: comparative, ratio, cash_flow, fund_flow, custom');
            $table->text('description')->nullable()->comment('Report description');

            // Report Configuration (JSON)
            $table->json('config')->nullable()->comment('Report configuration and filters');
            $table->json('columns')->nullable()->comment('Report columns configuration');
            $table->json('filters')->nullable()->comment('Report filters');

            // Date Range
            $table->date('start_date')->nullable()->comment('Report start date');
            $table->date('end_date')->nullable()->comment('Report end date');
            $table->string('period_type')->nullable()->comment('Period: monthly, quarterly, yearly, custom');

            // Comparison Data (for year-over-year)
            $table->date('compare_start_date')->nullable()->comment('Comparison period start');
            $table->date('compare_end_date')->nullable()->comment('Comparison period end');

            // Report Data (JSON - store generated results)
            $table->json('data')->nullable()->comment('Generated report data');
            $table->json('summary')->nullable()->comment('Report summary statistics');

            // Report Status
            $table->string('status')->default('pending')->comment('Status: pending, generating, completed, failed');
            $table->timestamp('generated_at')->nullable()->comment('When report was generated');
            $table->string('generated_by')->nullable()->comment('How report was generated: system, user, scheduled');

            // Scheduling
            $table->boolean('is_scheduled')->default(false)->comment('Is this a scheduled report?');
            $table->string('schedule_frequency')->nullable()->comment('Frequency: daily, weekly, monthly, quarterly');
            $table->date('next_run_date')->nullable()->comment('Next scheduled run date');
            $table->date('last_run_date')->nullable()->comment('Last run date');

            // Export Settings
            $table->string('export_format')->default('pdf')->comment('Default export format: pdf, excel, csv');
            $table->string('file_path')->nullable()->comment('Path to generated file');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('type');
            $table->index('status');
            $table->index('is_scheduled');
            $table->index('start_date');
            $table->index('end_date');
            $table->index('created_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_reports');
    }
};
