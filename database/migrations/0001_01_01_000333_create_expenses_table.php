<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();

            // Source tracking fields (added 2026-02-09) - Polymorphic relation to source (e.g., Payroll)
            $table->string('source_type')->nullable()->after('currency_id');
            $table->unsignedBigInteger('source_id')->nullable()->after('source_type');

            $table->string('title');
            $table->decimal('amount', 12, 2);

            // VAT fields
            $table->decimal('vat_percentage', 5, 2)->nullable()->comment('VAT percentage (e.g., 15.00 for 15%)');
            $table->decimal('vat_amount', 15, 2)->nullable()->comment('Calculated VAT amount');
            $table->string('vat_challan_no')->nullable()->comment('VAT challan number for tax authority');

            // Tax (AIT - Advance Income Tax) fields - nullable as they're optional
            $table->decimal('tax_percentage', 5, 2)->nullable()->comment('Tax/AIT percentage (e.g., 3.00 for 3%)');
            $table->decimal('tax_amount', 15, 2)->nullable()->comment('Calculated tax amount');
            $table->string('tax_challan_no')->nullable()->comment('Tax challan number for tax authority');

            $table->date('expense_date');
            $table->string('reference_number')->nullable();

            // Chart of account links
            $table->foreignId('account_id')->constrained('chart_of_accounts');
            $table->foreignId('payment_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete()->comment('Bank/Cash account to pay from');

            // Optional categorization
            $table->foreignId('project_id')->nullable()->constrained('projects')->nullOnDelete()->comment('Linked project');
            $table->foreignId('cost_center_id')->nullable()->constrained('cost_centers')->nullOnDelete()->comment('Linked cost center');
            $table->foreignId('expense_department_id')->nullable()->constrained('departments')->nullOnDelete()->comment('Linked department');

            // Payment and approval
            $table->foreignId('paid_by')->constrained('users');
            $table->string('attachment')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_approved')->default(false);

            $table->timestamps();

            // Indexes for reporting
            $table->index('project_id');
            $table->index('cost_center_id');
            $table->index('expense_department_id');
            $table->index(['source_type', 'source_id']); // Added 2026-02-09
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
