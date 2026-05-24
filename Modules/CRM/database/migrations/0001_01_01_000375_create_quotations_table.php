<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number')->unique();
            $table->foreignId('opportunity_id')->nullable()->constrained('opportunities')->onDelete('set null');
            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->enum('discount_type', ['fixed', 'percentage'])->default('fixed');
            $table->decimal('discount_amount', 10, 2)->default(0);
            $table->decimal('tax_amount', 10, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->date('valid_until');
            $table->dateTime('converted_to_order_at')->nullable();
            $table->enum('status', ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'])->default('draft');
            $table->text('customer_notes')->nullable();
            $table->text('terms_conditions')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
            $table->index(['customer_id', 'status']);
            $table->index(['status', 'valid_until']);
            $table->index('quotation_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quotations');
    }
};
