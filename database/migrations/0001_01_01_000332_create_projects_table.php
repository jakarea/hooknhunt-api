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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();

            // Project Details
            $table->string('name')->comment('Project name');
            $table->string('code')->unique()->comment('Unique project code');
            $table->text('description')->nullable()->comment('Project description');

            // Client/Customer
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete()->comment('Client/Customer');

            // Dates
            $table->date('start_date')->comment('Project start date');
            $table->date('end_date')->nullable()->comment('Project end date');
            $table->date('deadline')->nullable()->comment('Project deadline');

            // Budget & Financials
            $table->decimal('budget_amount', 15, 2)->default(0)->comment('Total project budget');
            $table->decimal('estimated_revenue', 15, 2)->default(0)->comment('Estimated revenue');
            $table->decimal('actual_cost', 15, 2)->default(0)->comment('Actual cost incurred');
            $table->decimal('actual_revenue', 15, 2)->default(0)->comment('Actual revenue earned');
            $table->decimal('profit', 15, 2)->default(0)->comment('Profit (revenue - cost)');
            $table->decimal('profit_margin', 5, 2)->default(0)->comment('Profit margin percentage');

            // Project Manager
            $table->foreignId('manager_id')->nullable()->constrained('users')->nullOnDelete()->comment('Project manager');
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete()->comment('Department');

            // Status & Priority
            $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])
                  ->default('planning')
                  ->comment('Project status');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])
                  ->default('medium')
                  ->comment('Project priority');

            // Progress Tracking
            $table->integer('progress_percentage')->default(0)->comment('Completion percentage (0-100)');

            // Cost Center
            $table->foreignId('cost_center_id')->nullable()->constrained('cost_centers')->nullOnDelete()->comment('Linked cost center');

            // Location
            $table->string('location')->nullable()->comment('Project location/site');

            // Attachments & Notes
            $table->text('notes')->nullable()->comment('Project notes');
            $table->json('attachments')->nullable()->comment('Project documents/attachments');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('customer_id');
            $table->index('manager_id');
            $table->index('department_id');
            $table->index('cost_center_id');
            $table->index('status');
            $table->index('start_date');
            $table->index('end_date');
            $table->index(['status', 'deadline']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
