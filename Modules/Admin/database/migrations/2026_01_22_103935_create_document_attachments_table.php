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
        Schema::create('document_attachments', function (Blueprint $table) {
            $table->id();

            // Document Information
            $table->string('file_name')->comment('Original file name');
            $table->string('file_path')->comment('Path to stored file');
            $table->string('file_type')->comment('MIME type');
            $table->unsignedBigInteger('file_size')->comment('File size in bytes');
            $table->string('file_extension')->comment('File extension');

            // Entity Information
            $table->string('entity_type')->nullable()->comment('Type of entity this document is attached to');
            $table->unsignedBigInteger('entity_id')->nullable()->comment('ID of the entity');

            // Link to Audit Log
            $table->foreignId('audit_log_id')->nullable()->constrained()->nullOnDelete()->comment('Associated audit log entry');

            // Document Metadata
            $table->string('document_type')->nullable()->comment('Type of document: invoice, receipt, contract, etc.');
            $table->string('document_number')->nullable()->comment('Document reference number');
            $table->date('document_date')->nullable()->comment('Date on the document');
            $table->text('description')->nullable()->comment('Document description');

            // Access Control
            $table->boolean('is_confidential')->default(false)->comment('Is this a confidential document?');
            $table->json('allowed_roles')->nullable()->comment('Roles that can access this document');

            // Upload Information
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete()->comment('User who uploaded');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['entity_type', 'entity_id']);
            $table->index('audit_log_id');
            $table->index('document_type');
            $table->index('uploaded_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_attachments');
    }
};
