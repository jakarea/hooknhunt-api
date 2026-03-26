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
        Schema::create('vendor_payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_number')->unique();
            $table->foreignId('supplier_id')->constrained()->onDelete('cascade');
            $table->foreignId('chart_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'card'])->default('bank_transfer');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'completed', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('supplier_id');
            $table->index('payment_date');
            $table->index('status');
            $table->index('payment_method');
        });

        // Create pivot table for vendor payments to bills (many-to-many)
        Schema::create('vendor_payment_bills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vendor_payment_id')->constrained()->onDelete('cascade');
            $table->foreignId('vendor_bill_id')->constrained()->onDelete('cascade');
            $table->decimal('amount_applied', 15, 2);
            $table->timestamps();

            $table->index('vendor_payment_id');
            $table->index('vendor_bill_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vendor_payment_bills');
        Schema::dropIfExists('vendor_payments');
    }
};
