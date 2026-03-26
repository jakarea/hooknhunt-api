<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class AuditLogMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // শুধুমাত্র POST, PUT, DELETE, PATCH মেথডগুলো ট্র্যাক করবো
        if (in_array($request->method(), ['POST', 'PUT', 'DELETE', 'PATCH'])) {
            
            $path = $request->path();
            
            // ১. চেক করা: এটি কি Auth সংক্রান্ত রিকোয়েস্ট (Login, Register, OTP)?
            $isAuthAction = str_contains($path, 'login') || 
                            str_contains($path, 'register') || 
                            str_contains($path, 'verify-otp') || 
                            str_contains($path, 'resend-otp');

            if ($isAuthAction) {
                $this->logAuthAction($request, $response);
            } else {
                $this->logGeneralAction($request, $response);
            }
        }

        return $response;
    }

    /**
     * সাধারণ অ্যাকশন অডিট (মাস্টার অডিট ফাইল)
     */
    private function logGeneralAction($request, $response)
    {
        $user = $request->user();
        $logDirectory = storage_path('logs/audit');
        $fileName = 'audit-' . now()->format('Y-m') . '.csv';
        $filePath = $logDirectory . '/' . $fileName;

        $this->ensureDirectoryExists($logDirectory);

        if (!File::exists($filePath)) {
            $header = "Date,User ID,User Name,Method,URL,IP,Payload,Status Code" . PHP_EOL;
            File::put($filePath, $header);
        }

        $data = [
            'date' => now()->format('Y-m-d H:i:s'),
            'user_id' => $user ? $user->id : 'Guest',
            'user_name' => $user ? $user->name : 'Guest',
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
            'payload' => json_encode($request->except(['password', 'password_confirmation', 'old_password', 'otp_code'])),
            'status_code' => $response->getStatusCode(),
        ];

        $this->appendToCsv($filePath, $data);
    }

    /**
     * লগইন, রেজিস্ট্রেশন এবং ওটিপি অডিট (আলাদা ফাইল)
     */
    private function logAuthAction($request, $response)
    {
        $logDirectory = storage_path('logs/auth_audit');
        $fileName = 'auth-audit-' . now()->format('Y-m') . '.csv';
        $filePath = $logDirectory . '/' . $fileName;

        $this->ensureDirectoryExists($logDirectory);

        if (!File::exists($filePath)) {
            $header = "Date,Action,Identity,IP,Status Code,User Agent" . PHP_EOL;
            File::put($filePath, $header);
        }

        // ইমেইল বা ফোন আইডেন্টিটি হিসেবে নেওয়া
        $identity = $request->input('email') ?? $request->input('phone') ?? $request->input('username') ?? 'Guest';

        $data = [
            'date' => now()->format('Y-m-d H:i:s'),
            'action' => strtoupper(str_replace(['v2/', 'auth/', '-'], ['', '', '_'], $request->path())),
            'identity' => $identity,
            'ip' => $request->ip(),
            'status_code' => $response->getStatusCode(),
            'user_agent' => $request->header('User-Agent'),
        ];

        $this->appendToCsv($filePath, $data);
    }

    private function ensureDirectoryExists($path)
    {
        if (!File::exists($path)) {
            File::makeDirectory($path, 0755, true);
        }
    }

    private function appendToCsv($filePath, $data)
    {
        $csvRow = implode(',', array_map(function($val) {
            return '"' . str_replace('"', '""', $val) . '"';
        }, $data));

        File::append($filePath, $csvRow . PHP_EOL);
    }
}