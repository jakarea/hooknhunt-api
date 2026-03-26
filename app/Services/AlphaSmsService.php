<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AlphaSmsService
{
    private string $baseUrl = 'https://api.sms.net.bd';
    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = env('ALPHA_SMS_API_KEY', '');
    }

    /**
     * Send SMS to one or multiple recipients
     */
    public function sendSms(string $message, string|array $recipients, ?string $senderId = null, ?string $scheduleTime = null): array
    {
        // Convert array to comma-separated string
        if (is_array($recipients)) {
            $recipients = implode(',', $recipients);
        }

        $data = [
            'api_key' => $this->apiKey,
            'msg' => $message,
            'to' => $recipients,
        ];

        if ($senderId) {
            $data['sender_id'] = $senderId;
        }

        if ($scheduleTime) {
            $data['schedule'] = $scheduleTime;
        }

        try {
            $response = Http::asForm()->post("{$this->baseUrl}/sendsms", $data);

            $result = $response->json();

            Log::info('Alpha SMS Send Response', ['response' => $result]);

            return $result ?? ['error' => 1, 'msg' => 'Unknown error occurred'];
        } catch (\Exception $e) {
            Log::error('Alpha SMS Send Error', ['error' => $e->getMessage()]);
            return [
                'error' => 1,
                'msg' => 'Failed to send SMS: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get delivery report for a request
     */
    public function getDeliveryReport(string $requestId): array
    {
        try {
            $response = Http::get("{$this->baseUrl}/report/request/{$requestId}/", [
                'api_key' => $this->apiKey,
            ]);

            $result = $response->json();

            return $result ?? ['error' => 1, 'msg' => 'Unknown error occurred'];
        } catch (\Exception $e) {
            Log::error('Alpha SMS Report Error', ['error' => $e->getMessage()]);
            return [
                'error' => 1,
                'msg' => 'Failed to get delivery report: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get account balance
     */
    public function getBalance(): array
    {
        try {
            $response = Http::get("{$this->baseUrl}/user/balance/", [
                'api_key' => $this->apiKey,
            ]);

            $result = $response->json();

            return $result ?? ['error' => 1, 'msg' => 'Unknown error occurred'];
        } catch (\Exception $e) {
            Log::error('Alpha SMS Balance Error', ['error' => $e->getMessage()]);
            return [
                'error' => 1,
                'msg' => 'Failed to get balance: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Send OTP verification SMS
     */
    public function sendOTP(string $phone, string $otp): array
    {
        $message = "Your Hook & Hunt verification code is: {$otp}. Valid for 5 minutes. Please do not share this code.";

        // Format phone number properly
        $formattedPhone = $this->validatePhoneNumber($phone);

        // Send SMS without custom sender ID to avoid validation issues
        return $this->sendSms($message, $formattedPhone);
    }

    /**
     * Validate phone number format
     */
    public function validatePhoneNumber(string $phone): string
    {
        // Remove spaces and dashes
        $phone = preg_replace('/[\s-]/', '', $phone);

        // If starts with +880, convert to 880
        if (str_starts_with($phone, '+880')) {
            $phone = substr($phone, 1);
        }

        // If starts with 01, convert to 8801
        if (str_starts_with($phone, '01')) {
            $phone = '88' . $phone;
        }

        return $phone;
    }
}
