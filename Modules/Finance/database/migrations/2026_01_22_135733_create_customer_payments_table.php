<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('customer_payments', function (Blueprint $table) {
            $table->id();
            $table->string('payment_number')->unique();
            $table->foreignId('customer_id')->constrained()->onDelete('cascade');
            $table->foreignId('chart_account_id')->nullable()->constrained('chart_of_accounts')->nullOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->enum('payment_method', ['cash', 'bank_transfer', 'cheque', 'card', 'mobile'])->default('bank_transfer');
            $table->string('reference_number')->nullable();
            $table->text('notes')->nullable();
            $table->enum('status', ['draft', 'completed', 'cancelled'])->default('draft');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('customer_id');
            $table->index('payment_date');
            $table->index('status');
            $table->index('payment_method');
        });

        Schema::create('customer_payment_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_payment_id')->constrained()->onDelete('cascade');
            $table->foreignId('customer_invoice_id')->constrained()->onDelete('cascade');
            $table->decimal('amount_applied', 15, 2);
            $table->timestamps();

            $table->index('customer_payment_id');
            $table->index('customer_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_payment_invoices');
        Schema::dropIfExists('customer_payments');
    }
};
