<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['sick', 'casual', 'unpaid'])->default('casual');

            // Merged: Changed from date to datetime
            $table->dateTime('start_date');
            $table->dateTime('end_date');

            $table->integer('days_count')->default(1);
            $table->text('reason')->nullable();
            $table->text('admin_note')->nullable(); // Merged from modification
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaves');
    }
};
