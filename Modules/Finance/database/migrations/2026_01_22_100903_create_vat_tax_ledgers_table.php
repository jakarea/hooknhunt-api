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
        Schema::create('vat_tax_ledgers', function (Blueprint $table) {
            $table->id();

            // Transaction Reference
            $table->string('transaction_type')->comment('Type: expense, sale, purchase');
            $table->unsignedBigInteger('transaction_id')->comment('Reference to expense_id, sale_id, etc.');
            $table->date('transaction_date')->comment('Date of original transaction');

            // Tax Details
            $table->enum('tax_type', ['vat', 'tax', 'ait'])->comment('VAT, Tax, or Advance Income Tax');
            $table->decimal('base_amount', 15, 2)->default(0)->comment('Amount before tax');
            $table->decimal('tax_rate', 5, 2)->default(0)->comment('Tax percentage');
            $table->decimal('tax_amount', 15, 2)->default(0)->comment('Calculated tax amount');

            // Direction
            $table->enum('direction', ['input', 'output'])->comment('Input = paid on purchases, Output = collected on sales');
            $table->enum('flow_type', ['debit', 'credit'])->comment('Debit increases payable, Credit decreases payable');

            // Ledger Account Linking
            $table->foreignId('chart_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete()->comment('Linked VAT/Tax account');

            // Challan Details
            $table->string('challan_number')->nullable()->comment('Tax challan number');
            $table->date('challan_date')->nullable()->comment('Tax challan date');

            // Payment Tracking
            $table->boolean('is_paid')->default(false)->comment('Whether tax has been paid to authority');
            $table->date('payment_date')->nullable()->comment('Date of tax payment');
            $table->string('payment_reference')->nullable()->comment('Payment reference number');

            // Period Tracking
            $table->string('fiscal_year')->nullable()->comment('Fiscal year (e.g., 2024-2025)');
            $table->string('tax_period')->nullable()->comment('Tax period (e.g., July 2024)');

            // Status
            $table->enum('status', ['pending', 'filed', 'paid'])->default('pending')->comment('Tax filing status');

            // Notes
            $table->text('notes')->nullable()->comment('Additional notes');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('transaction_type');
            $table->index('transaction_id');
            $table->index('tax_type');
            $table->index('direction');
            $table->index('fiscal_year');
            $table->index('tax_period');
            $table->index('status');
            $table->index(['tax_type', 'direction', 'fiscal_year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vat_tax_ledgers');
    }
};
