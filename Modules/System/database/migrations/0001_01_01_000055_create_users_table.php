<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->foreignId('role_id')->constrained('roles')->onDelete('restrict');
            $table->string('name');
            $table->string('phone')->unique();
            $table->string('email')->unique()->nullable();
            $table->string('password');
            $table->boolean('is_active')->default(true);
            $table->timestamp('phone_verified_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
            $table->softDeletes(); // Soft delete - no data loss

            $table->index(['role_id', 'is_active'], 'users_role_status_index');

            // Index for created_at sorting (common in listings)
            $table->index('created_at', 'users_created_at_index');

            // Index for name searches
            $table->index('name', 'users_name_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
