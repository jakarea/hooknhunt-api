<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Add EPS-specific fields to payment_transactions table
     */
    public function up(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            // EPS authentication token (received from initiate call)
            $table->string('auth_token')->nullable()->after('gateway_tran_id');

            // EPS-specific transaction ID (may differ from gateway_tran_id)
            $table->string('eps_tran_id')->nullable()->after('auth_token');

            // Payment channel classification
            $table->string('payment_channel')->nullable()
                ->comment('Internet Banking, Mobile Banking, Card')
                ->after('payment_method');

            // Specific bank or wallet name (e.g., bKash, City Bank)
            $table->string('bank_name')->nullable()
                ->comment('Specific bank/wallet name')
                ->after('payment_channel');

            // Card type if payment was via card
            $table->string('card_type')->nullable()
                ->comment('Visa, MasterCard, etc.')
                ->after('bank_name');

            // Full EPS response (separate from generic gateway_response)
            $table->json('eps_response')->nullable()
                ->comment('Full EPS API response')
                ->after('gateway_response');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table) {
            $table->dropColumn([
                'auth_token',
                'eps_tran_id',
                'payment_channel',
                'bank_name',
                'card_type',
                'eps_response',
            ]);
        });
    }
};
