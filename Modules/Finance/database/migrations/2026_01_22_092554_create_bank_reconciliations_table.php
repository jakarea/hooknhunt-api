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
        Schema::create('bank_reconciliations', function (Blueprint $table) {
            $table->id();

            // Bank relationship
            $table->foreignId('bank_id')->constrained('banks')->cascadeOnDelete();

            // Statement period
            $table->date('statement_date')->comment('Bank statement date');
            $table->string('statement_number')->nullable()->comment('Bank statement number');

            // Balances per bank statement
            $table->decimal('opening_balance', 15, 2)->default(0)->comment('Opening balance per bank statement');
            $table->decimal('closing_balance', 15, 2)->default(0)->comment('Closing balance per bank statement');

            // Balances per company books (system)
            $table->decimal('book_balance', 15, 2)->default(0)->comment('Balance per company books/system');

            // Adjustments
            $table->decimal('deposits_in_transit', 15, 2)->default(0)->comment('Deposits not yet cleared by bank');
            $table->decimal('outstanding_checks', 15, 2)->default(0)->comment('Checks issued but not yet presented');
            $table->decimal('bank_charges', 15, 2)->default(0)->comment('Bank charges/fees not recorded in books');
            $table->decimal('interest_earned', 15, 2)->default(0)->comment('Interest earned not recorded in books');
            $table->decimal('other_adjustments', 15, 2)->default(0)->comment('Other adjustments');

            // Reconciliation result
            $table->decimal('adjusted_balance', 15, 2)->default(0)->comment('Adjusted balance (book balance + adjustments)');
            $table->decimal('difference', 15, 2)->default(0)->comment('Difference between adjusted and closing balance');

            // Status
            $table->boolean('is_reconciled')->default(false)->comment('Whether reconciliation balances');
            $table->timestamp('reconciled_at')->nullable()->comment('When reconciliation was completed');
            $table->foreignId('reconciled_by')->nullable()->constrained('users')->nullOnDelete();

            // Notes and attachments
            $table->text('notes')->nullable();
            $table->string('attachment')->nullable()->comment('Bank statement attachment');

            // Audit trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            // Indexes
            $table->index('bank_id');
            $table->index('statement_date');
            $table->index('is_reconciled');
            $table->index(['bank_id', 'statement_date'])->unique();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bank_reconciliations');
    }
};
