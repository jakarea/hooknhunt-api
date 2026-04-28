<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Create table for tracking Lazychat webhook calls.
     * Stores all webhook attempts, responses, and failure details.
     */
    public function up(): void
    {
        Schema::create('lazychat_webhook_logs', function (Blueprint $table) {
            $table->id();

            // Product reference
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');

            // Event details
            $table->string('event_type'); // product.created, product.updated, product.deleted
            $table->string('webhook_topic'); // product/create, product/update

            // Request data
            $table->json('payload')->nullable(); // Full payload sent to Lazychat

            // Response data
            $table->string('status')->default('pending'); // pending, success, failed
            $table->integer('response_code')->nullable(); // HTTP status code
            $table->json('response_body')->nullable(); // Response from Lazychat
            $table->text('error_message')->nullable(); // Error details if failed

            // Retry tracking
            $table->integer('attempts')->default(0); // Number of attempts made
            $table->timestamp('retry_after')->nullable(); // When to retry next
            $table->timestamp('sent_at')->nullable(); // When successfully sent
            $table->timestamp('last_attempted_at')->nullable(); // Last attempt timestamp

            // Metadata
            $table->string('job_id')->nullable(); // Queue job ID for tracking
            $table->json('metadata')->nullable(); // Additional debugging info

            $table->timestamps();

            // Indexes for faster queries
            $table->index(['product_id', 'event_type']);
            $table->index('status');
            $table->index('created_at');
            $table->index('retry_after');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lazychat_webhook_logs');
    }
};
