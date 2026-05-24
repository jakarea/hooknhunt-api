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
        Schema::create('cost_centers', function (Blueprint $table) {
            $table->id();

            // Cost Center Details
            $table->string('name')->comment('Cost center name');
            $table->string('code')->unique()->comment('Unique cost center code');
            $table->text('description')->nullable()->comment('Description');

            // Department
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete()->comment('Linked department');

            // Manager
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete()->comment('Cost center manager');

            // Budget
            $table->decimal('monthly_budget', 15, 2)->default(0)->comment('Monthly budget limit');
            $table->decimal('actual_spent', 15, 2)->default(0)->comment('Actual amount spent');
            $table->decimal('remaining_budget', 15, 2)->default(0)->comment('Remaining budget');

            // Location
            $table->string('location')->nullable()->comment('Physical location');

            // Status
            $table->boolean('is_active')->default(true)->comment('Active status');

            // Notes
            $table->text('notes')->nullable()->comment('Additional notes');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('department_id');
            $table->index('manager_id');
            $table->index('is_active');
            $table->index('code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cost_centers');
    }
};
