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
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            // Entity Information
            $table->string('entity_type')->comment('Type of entity: BankTransaction, Expense, ChartOfAccount, etc.');
            $table->unsignedBigInteger('entity_id')->comment('ID of the entity');
            $table->string('entity_identifier')->nullable()->comment('Human-readable identifier like invoice number, account code');

            // Action Information
            $table->string('action')->comment('Action: created, updated, deleted, restored, approved, rejected, reversed');
            $table->text('description')->nullable()->comment('Human-readable description of what happened');

            // User Information
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete()->comment('User who performed the action');
            $table->string('performed_by_name')->nullable()->comment('Name of user (cached for when user is deleted)');
            $table->ipAddress('ip_address')->nullable()->comment('IP address of the user');
            $table->string('user_agent')->nullable()->comment('Browser/user agent');

            // Change Tracking (Old vs New Values)
            $table->json('old_values')->nullable()->comment('Previous values of changed fields');
            $table->json('new_values')->nullable()->comment('New values of changed fields');
            $table->json('changed_fields')->nullable()->comment('List of fields that were changed');

            // Additional Context
            $table->string('related_entity_type')->nullable()->comment('Type of related entity');
            $table->unsignedBigInteger('related_entity_id')->nullable()->comment('ID of related entity');

            // Reversal Tracking
            $table->unsignedBigInteger('original_audit_id')->nullable()->comment('Original audit log ID for reversals');
            $table->string('reversal_reason')->nullable()->comment('Reason for reversal');
            $table->foreign('original_audit_id')->references('id')->on('audit_logs')->nullOnDelete();

            // Metadata
            $table->json('metadata')->nullable()->comment('Additional context or tags');
            $table->string('source')->default('web')->comment('Source of action: web, api, system, import');

            $table->timestamps();
            $table->index(['entity_type', 'entity_id']);
            $table->index('performed_by');
            $table->index('action');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
