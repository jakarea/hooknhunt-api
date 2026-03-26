<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('opportunities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->nullable()->constrained('leads')->onDelete('set null');
            $table->foreignId('customer_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('title');
            $table->text('description')->nullable();
            $table->decimal('value', 12, 2)->default(0);
            $table->string('currency', 3)->default('BDT');
            $table->unsignedTinyInteger('probability')->default(50);
            $table->date('expected_close_date')->nullable();
            $table->enum('stage', ['qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'])->default('qualification');
            $table->unsignedInteger('stage_order')->default(1);
            $table->string('source')->nullable();
            $table->string('lost_reason')->nullable();
            $table->foreignId('assigned_to')->nullable()->comment('Assigned staff member')->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->nullable()->comment('Created by staff member')->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss
            $table->index('stage');
            $table->index(['customer_id', 'stage']);
            $table->index(['assigned_to', 'stage']);
            $table->index('value');
            $table->index('expected_close_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('opportunities');
    }
};
