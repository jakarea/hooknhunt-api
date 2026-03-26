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
        Schema::create('budgets', function (Blueprint $table) {
            $table->id();

            // Budget Identification
            $table->string('name')->comment('Budget name/title');
            $table->text('description')->nullable()->comment('Budget description');
            $table->foreignId('account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete()->comment('Linked chart of account (optional)');

            // Budget Scope
            $table->enum('scope_type', ['company', 'department', 'account'])->default('company')->comment('Budget scope level');
            $table->string('scope_id')->nullable()->comment('Department ID or other scope identifier');

            // Budget Period
            $table->enum('period_type', ['monthly', 'quarterly', 'yearly', 'custom'])->default('monthly')->comment('Budget period type');
            $table->string('fiscal_year')->comment('Fiscal year (e.g., 2024-2025)');
            $table->string('period_name')->nullable()->comment('Period name (e.g., July 2024, Q1 2024)');

            // Budget Dates
            $table->date('start_date')->comment('Budget start date');
            $table->date('end_date')->comment('Budget end date');

            // Budget Amounts
            $table->decimal('planned_amount', 15, 2)->default(0)->comment('Planned/budgeted amount');
            $table->decimal('actual_amount', 15, 2)->default(0)->comment('Actual amount spent/earned');
            $table->decimal('variance', 15, 2)->default(0)->comment('Difference between planned and actual');
            $table->decimal('variance_percentage', 5, 2)->default(0)->comment('Variance as percentage');

            // Budget Status
            $table->enum('status', ['draft', 'active', 'completed', 'exceeded'])->default('draft')->comment('Budget status');
            $table->decimal('alert_threshold', 5, 2)->default(80)->comment('Alert threshold percentage (e.g., 80% of budget)');
            $table->boolean('alert_sent')->default(false)->comment('Whether alert has been sent');

            // Approval
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->comment('User who approved budget');
            $table->timestamp('approved_at')->nullable()->comment('Approval timestamp');

            // Notes
            $table->text('notes')->nullable()->comment('Additional notes');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('fiscal_year');
            $table->index('period_type');
            $table->index('status');
            $table->index('scope_type');
            $table->index(['fiscal_year', 'period_type']);
            $table->index(['account_id', 'fiscal_year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('budgets');
    }
};
