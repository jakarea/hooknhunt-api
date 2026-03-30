<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\VerifyOtpRequest;
use App\Models\User;
use App\Models\Otp;
use App\Models\Customer;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * 1. Register User & Send OTP
     */
    public function register(RegisterRequest $request)
    {
        // Check if phone already exists (manual check to return phone_verified flag)
        $existingUser = User::where('phone', $request->phone)->first();

        if ($existingUser) {
            $isVerified = !is_null($existingUser->phone_verified_at);

            // Phone registered but NOT verified → resend OTP, redirect to OTP page
            if (!$isVerified) {
                $this->sendOtp($existingUser->phone, $existingUser->id);
            }

            return response()->json([
                'status' => false,
                'message' => $isVerified
                    ? 'This phone number is already registered.'
                    : 'Phone registered but not verified.',
                'data' => ['phone_verified' => $isVerified],
                'errors' => [
                    'phone' => [$isVerified
                        ? 'This phone number is already registered and verified.'
                        : 'This phone number is registered but not verified.'],
                ],
            ], 422);
        }

        DB::beginTransaction();
        try {
            $user = User::create([
                'name' => $request->name,
                'phone' => $request->phone,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => 10, // Retail Customer (fixed role_id)
                'is_active' => false, // Inactive until OTP verified
            ]);

            $user->profile()->create();

            // Create Customer record for storefront orders
            Customer::create([
                'user_id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone,
                'type' => 'retail',
            ]);

            // Send OTP
            $this->sendOtp($user->phone, $user->id);

            DB::commit();

            return $this->sendSuccess(null, 'Registration successful. Please verify OTP sent to your phone.', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Registration failed', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * 2. Register Super Admin (Special endpoint for creating super admin)
     */
    public function registerSuperAdmin(Request $request)
    {
        DB::beginTransaction();
        try {
            // Validate
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'phone' => 'required|string|unique:users,phone',
                'password' => 'required|string|min:6|confirmed',
            ]);

            // Create Super Admin User
            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $validated['phone'],
                'password' => Hash::make($validated['password']),
                'role_id' => 1, // Super Admin
                'is_active' => true,
                'phone_verified_at' => now(), // Auto verified
            ]);

            // Get or create Administration department
            try {
                $department = \App\Models\Department::firstOrCreate(
                    ['name' => 'Administration'],
                    [
                        'description' => 'Administration Department',
                        'is_active' => true,
                    ]
                );

                // Verify department was created/found
                if (!$department || !$department->id) {
                    throw new \Exception('Department creation returned null or invalid ID');
                }

            } catch (\Exception $deptError) {
                throw new \Exception('Failed to create Administration department: ' . $deptError->getMessage());
            }

            // Create Staff Profile
            $user->staffProfile()->create([
                'department_id' => $department->id,
                'designation' => 'Super Administrator',
                'base_salary' => 20000,
                'house_rent' => 16000,
                'medical_allowance' => 4000,
                'conveyance_allowance' => 4000,
                'overtime_hourly_rate' => 1000,
                'joining_date' => now(),
                'gender' => 'male',
            ]);

            DB::commit();

            return $this->sendSuccess([
                'user' => $user->load('staffProfile'),
                'message' => 'Super Admin created successfully. You can now login.'
            ], 'Super Admin registration successful.', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Registration failed', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * 3. Verify OTP & Activate Account
     */
    public function verifyOtp(VerifyOtpRequest $request)
    {
        // Find latest OTP
        $otpRecord = Otp::where('identifier', $request->phone)
                        ->where('token', $request->otp)
                        ->first();

        // Check validity
        if (!$otpRecord || !$otpRecord->isValid()) {
            return $this->sendValidationError(['otp' => ['Invalid or expired OTP code.']]);
        }

        // Activate User
        $user = User::where('phone', $request->phone)->first();
        
        if ($user->phone_verified_at) {
            return $this->sendSuccess(null, 'Account is already verified. Please login.');
        }

        $user->update([
            'phone_verified_at' => now(),
            'is_active' => true
        ]);

        // Delete used OTP
        $otpRecord->delete();

        // Auto Login after verification
        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->sendSuccess([
            'access_token' => $token,
            'user' => $user->load('role')
        ], 'Phone verified successfully.');
    }

    /**
     * 3. Login
     */
    public function login(LoginRequest $request)
    {
        $fieldType = filter_var($request->login_id, FILTER_VALIDATE_EMAIL) ? 'email' : 'phone';

        // Explicitly load role and permissions (auto-loading removed from User model)
        $user = User::with('role.permissions')->where($fieldType, $request->login_id)->first();

        // 1. User Existence Check
        if (!$user) {
            return $this->sendError("User not found with {$fieldType}: {$request->login_id}", [
                'searched_field' => $fieldType,
                'searched_value' => $request->login_id,
                'suggestion' => 'Please register first or check your credentials'
            ], 401);
        }

        // Debug: Log user data
        \Log::info('LOGIN ATTEMPT - User Found', [
            'user_id' => $user->id,
            'email' => $user->email,
            'phone' => $user->phone,
            'password_exists' => !empty($user->password),
            'password_length' => strlen($user->password ?? ''),
        ]);

        // Check if user has empty data (corrupted record)
        if (empty($user->email) && empty($user->phone)) {
            return $this->sendError('User account data corrupted. Please re-register.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'phone' => $user->phone,
                'created_at' => $user->created_at,
                'suggestion' => 'Delete this user and register again'
            ], 401);
        }

        // 2. Hashed Password Check
        if (!Hash::check($request->password, $user->password)) {
            return $this->sendError('Invalid id or password', [
                'email' => $user->email,
                'phone' => $user->phone,
            ], 401);
        }

        // 3. Phone Verification Check
        if (!$user->phone_verified_at) {
            $this->sendOtp($user->phone, $user->id);

            return response()->json([
                'status' => false,
                'message' => 'Phone number not verified. OTP has been sent.',
                'data' => null,
                'errors' => [
                    'error_code' => 'phone_not_verified',
                    'phone' => $user->phone,
                ],
            ], 403);
        }

        // 4. Account Status Check
        if (!$user->is_active) {
            return $this->sendError("Account inactive for user: {$user->email}", [
                'user_id' => $user->id,
                'is_active' => $user->is_active,
                'reason' => 'Account is suspended or inactive',
            ], 403);
        }

        // 5. Generate Token
        $token = $user->createToken('auth_token')->plainTextToken;

        // Convert user to array to trigger accessors that sanitize null bytes
        $userData = $user->toArray();

        return $this->sendSuccess([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $userData
        ], 'Login successful');
    }

    /**
     * 4. Resend OTP Helper
     */
    public function resendOtp(Request $request)
    {
        $request->validate(['phone' => 'required|exists:users,phone']);
        
        $user = User::where('phone', $request->phone)->first();
        $this->sendOtp($request->phone, $user->id);
        
        return $this->sendSuccess(null, 'OTP sent successfully.');
    }

    /**
     * Send OTP (public - reusable from other controllers)
     */
    public function sendOtp($phone, $userId)
    {
        // 1. Delete old OTPs for this phone
        Otp::where('identifier', $phone)->delete();

        // 2. Generate 5 Digit Code
        $code = rand(10000, 99999);

        // 3. Store in DB (Added user_id)
        Otp::create([
            'user_id' => $userId, // <--- NEW ADDITION
            'identifier' => $phone,
            'token' => $code,
            'expires_at' => Carbon::now()->addSeconds(120) // 2 minutes expiry
        ]);

        // 4. Send SMS Log
        \Log::info("OTP for User ID {$userId} ({$phone}): {$code}");
    }

    public function profile(Request $request)
    {
        $user = $request->user()->load('role.permissions');

        return response()->json([
            'status' => true,
            'message' => 'Profile retrieved successfully',
            'data' => [
                'user' => $user->toArray()
            ]
        ]);
    }
}