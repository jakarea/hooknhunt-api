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
        Schema::create('cheques', function (Blueprint $table) {
            $table->id();

            // Cheque Details
            $table->string('cheque_number')->unique()->comment('Cheque number');
            $table->date('issue_date')->comment('Date when cheque was issued');
            $table->date('due_date')->comment('Date when cheque is due (post-dated)');
            $table->decimal('amount', 15, 2)->comment('Cheque amount');
            $table->string('payee_name')->comment('Name of the payee');

            // Bank Information
            $table->foreignId('bank_id')->nullable()->constrained('banks')->nullOnDelete()->comment('Bank account');
            $table->string('bank_name')->nullable()->comment('Bank name (if account deleted)');
            $table->string('branch_name')->nullable()->comment('Bank branch name');

            // Type & Direction
            $table->enum('type', ['incoming', 'outgoing'])->comment('Incoming = receive, Outgoing = payment');
            $table->string('reference_type')->nullable()->comment('Linked entity type: sale, purchase, expense, etc.');
            $table->unsignedBigInteger('reference_id')->nullable()->comment('Linked entity ID');

            // Status Tracking
            $table->enum('status', ['pending', 'deposited', 'cleared', 'bounced', 'cancelled', 'dishonored'])
                  ->default('pending')
                  ->comment('Current cheque status');
            $table->date('deposit_date')->nullable()->comment('Date when cheque was deposited');
            $table->date('clearance_date')->nullable()->comment('Date when cheque was cleared');
            $table->text('bounce_reason')->nullable()->comment('Reason if cheque bounced');

            // Party Details
            $table->string('party_name')->nullable()->comment('Customer/Vender name');
            $table->string('party_contact')->nullable()->comment('Contact information');

            // Notes & Attachment
            $table->text('notes')->nullable()->comment('Additional notes');
            $table->string('attachment')->nullable()->comment('Cheque image/document');

            // Alert Settings
            $table->boolean('alert_sent')->default(false)->comment('Whether due date alert was sent');
            $table->timestamp('alert_sent_at')->nullable()->comment('When alert was sent');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('cheque_number');
            $table->index('due_date');
            $table->index('status');
            $table->index('type');
            $table->index(['bank_id', 'status']);
            $table->index(['due_date', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cheques');
    }
};
