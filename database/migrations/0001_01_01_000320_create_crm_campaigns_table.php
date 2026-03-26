<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('type')->default('pdf_catalog');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->foreignId('crm_segment_id')->nullable()->constrained('crm_segments');
            $table->string('status')->default('draft');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_campaigns');
    }
};
