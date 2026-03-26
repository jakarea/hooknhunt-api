<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('currency_id')->nullable()->constrained('currencies')->nullOnDelete();
            $table->string('name');
            $table->string('account_number')->nullable();
            $table->string('account_name')->nullable();

            $table->enum('type', ['cash', 'bank', 'bkash', 'nagad', 'rocket', 'other'])->default('bank');
            $table->string('branch')->nullable();
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->string('phone')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->text('notes')->nullable();

            // Chart of account link (added 2026-02-06)
            $table->foreignId('chart_of_account_id')
                ->nullable()
                ->after('notes')
                ->constrained('chart_of_accounts')
                ->nullOnDelete();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banks');
    }
};
