<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('staff_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->date('dob')->nullable();
            $table->enum('gender', ['male', 'female', 'other'])->nullable();

            // Profile photo
            $table->foreignId('profile_photo_id')->nullable()->constrained('media_files')->onDelete('set null');

            // Bank account fields (added 2026-02-09)
            $table->string('bank_account_name')->nullable()->after('profile_photo_id');
            $table->string('bank_account_number')->nullable()->after('bank_account_name');
            $table->string('bank_name')->nullable()->after('bank_account_number');
            $table->string('bank_branch')->nullable()->after('bank_name');

            // Address information
            $table->text('address')->nullable();
            $table->string('division')->nullable();
            $table->string('district')->nullable();
            $table->string('thana')->nullable();

            // Department information
            $table->foreignId('department_id')->nullable()->constrained('departments')->onDelete('set null');
            $table->string('designation')->nullable();
            $table->date('joining_date')->nullable();

            // Contact information
            $table->string('office_email')->nullable();
            $table->string('office_email_password')->nullable();
            $table->string('whatsapp_number')->nullable();

            // Salary components
            $table->decimal('base_salary', 10, 2)->default(0);
            $table->decimal('house_rent', 10, 2)->default(0);
            $table->decimal('medical_allowance', 10, 2)->default(0);
            $table->decimal('conveyance_allowance', 10, 2)->default(0);
            $table->decimal('overtime_hourly_rate', 10, 2)->default(0);

            $table->softDeletes();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_profiles');
    }
};
