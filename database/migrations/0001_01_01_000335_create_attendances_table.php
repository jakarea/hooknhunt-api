<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('date')->index();
            $table->time('clock_in')->nullable();
            $table->text('break_in')->nullable();
            $table->text('break_out')->nullable();
            $table->time('clock_out')->nullable();
            $table->enum('status', ['present', 'late', 'absent', 'leave', 'holiday'])->default('absent');
            $table->text('note')->nullable();
            $table->json('break_notes')->nullable();
            $table->foreignId('updated_by')->nullable()->constrained('users');
            $table->unique(['user_id', 'date']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
