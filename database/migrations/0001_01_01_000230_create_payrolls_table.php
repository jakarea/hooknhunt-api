<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->string('month_year');

            // Basic salary
            $table->decimal('basic_salary', 12, 2);

            // Salary components (added 2026-02-09)
            $table->decimal('house_rent', 10, 2)->default(0)->after('basic_salary');
            $table->decimal('medical_allowance', 10, 2)->default(0)->after('house_rent');
            $table->decimal('conveyance_allowance', 10, 2)->default(0)->after('medical_allowance');
            $table->decimal('overtime_hourly_rate', 10, 2)->default(0)->after('conveyance_allowance');
            $table->decimal('total_overtime_hours', 8, 2)->default(0)->after('overtime_hourly_rate');
            $table->decimal('overtime_amount', 10, 2)->default(0)->after('total_overtime_hours');

            // Totals
            $table->decimal('bonus', 10, 2)->default(0);
            $table->decimal('deductions', 10, 2)->default(0);
            $table->decimal('net_payable', 12, 2);

            // Status with 'processing' option (added 2026-02-09)
            $table->enum('status', ['generated', 'processing', 'paid'])->default('generated')->after('net_payable');

            $table->date('payment_date')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payrolls');
    }
};
