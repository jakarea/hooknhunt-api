<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\System\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class AuthController extends Controller
{
    use ApiResponse;

    /**
     * Register a new user.
     */
    public function register(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'login_id' => 'nullable|string|regex:/^[0-9]{11}$/',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
                'email' => 'nullable|email|unique:users,email',
                'password' => 'required|string|min:6|confirmed',
            ]);

            // Support both login_id and phone fields
            $phone = $validated['login_id'] ?? $validated['phone'] ?? null;

            if (!$phone) {
                return $this->sendError('Phone number or Login ID is required.', null, 422);
            }

            // Check if user exists
            $existingUser = User::where('phone', $phone)->first();
            if ($existingUser) {
                return $this->sendError('User with this phone number already exists.', null, 400);
            }

            // Create user
            $user = User::create([
                'name' => $validated['name'],
                'phone' => $phone,
                'email' => $validated['email'] ?? null,
                'password' => Hash::make($validated['password']),
                'role_id' => config('roles.customer.retail_id', 10), // Default to retail customer
            ]);

            // Load role with permissions for the frontend
            // This is required for the sidebar navigation and permission checking
            $user->load(['role.permissions']);

            // Generate OTP for verification
            $otp = $this->generateOtp($user->phone, 'registration', $user->id);

            // Send OTP via SMS (implementation depends on your SMS service)
            // $this->sendOtpSms($user->phone, $otp);

            return $this->sendSuccess([
                'user' => $user->makeHidden(['password']),
                'phone' => $user->phone,
                'message' => 'OTP sent to your phone for verification'
            ], 'Registration successful. Please verify your phone number.', 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Registration error', ['error' => $e->getMessage()]);
            return $this->sendError('Registration failed. Please try again.', null, 500);
        }
    }

    /**
     * Login user.
     */
    public function login(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'login_id' => 'nullable|string|regex:/^[0-9]{11}$/',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
                'email' => 'nullable|email',
                'password' => 'required|string',
            ]);

            // Support both login_id and phone/email fields
            $loginIdentifier = $validated['login_id'] ?? $validated['phone'] ?? $validated['email'] ?? null;

            if (!$loginIdentifier) {
                return $this->sendError('Login ID, phone or email is required.', null, 422);
            }

            // Find user by phone, email, or login_id
            $user = User::where('phone', $loginIdentifier)
                ->orWhere('email', $loginIdentifier)
                ->first();

            if (!$user || !Hash::check($validated['password'], $user->password)) {
                return $this->sendError('Invalid phone number or password.', null, 401);
            }

            // Check if user is active
            if ($user->is_active === false) {
                return $this->sendError('Your account has been deactivated.', null, 403);
            }

            // Delete existing tokens
            $user->tokens()->delete();

            // Get the AUTH_MODEL class for token creation
            $authModel = config('auth.providers.users.model');
            $userForToken = $authModel::find($user->id);

            // Create new token using the correct user model
            $token = $userForToken->createToken('auth-token')->plainTextToken;

            // Load role with permissions for the frontend
            // This is required for the sidebar navigation and permission checking
            $user->load(['role.permissions']);

            // Create response
            $response = $this->sendSuccess([
                'user' => $user->makeHidden(['password']),
                'token' => $token,
                'token_type' => 'Bearer'
            ], 'Login successful.');

            // Set HTTP-only cookie for middleware-based authentication
            // Get the origin domain from the request (Next.js proxy forwards the origin)
            $origin = $request->headers->get('origin');
            $host = $request->headers->get('x-forwarded-host') ?: $request->getHost();
            $cookieDomain = null;

            // Extract domain for local development (e.g., hooknhunt-api.test)
            if (str_contains($host, 'hooknhunt-api.test')) {
                $cookieDomain = '.hooknhunt-api.test';
            } elseif (str_contains($host, 'localhost')) {
                $cookieDomain = null; // Localhost doesn't need domain
            }

            $isSecure = $request->secure() || str_contains($host, 'hooknhunt-api.test');
            $cookie = cookie('auth_token', $token, 60 * 24 * 30, '/', $cookieDomain, $isSecure, true, false, 'Lax');
            $response->withCookie($cookie);

            return $response;

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Login error', ['error' => $e->getMessage()]);
            return $this->sendError('Login failed. Please try again.', null, 500);
        }
    }

    /**
     * Resend OTP.
     */
    public function resendOtp(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'login_id' => 'nullable|string|regex:/^[0-9]{11}$/',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
            ]);

            $phone = $validated['login_id'] ?? $validated['phone'] ?? null;

            if (!$phone) {
                return $this->sendError('Phone number or Login ID is required.', null, 422);
            }

            $user = User::where('phone', $phone)->first();
            if (!$user) {
                return $this->sendError('User not found with this phone number.', null, 404);
            }

            // Generate and send new OTP
            $otp = $this->generateOtp($phone, 'verification', $user->id);

            return $this->sendSuccess([
                'phone' => $phone,
                'message' => 'OTP resent successfully'
            ], 'OTP has been sent to your phone.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Resend OTP error', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to resend OTP. Please try again.', null, 500);
        }
    }

    /**
     * Verify OTP.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'login_id' => 'nullable|string|regex:/^[0-9]{11}$/',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
                'otp' => 'required|string|size:5',
            ]);

            $phone = $validated['login_id'] ?? $validated['phone'] ?? null;

            if (!$phone) {
                return $this->sendError('Phone number or Login ID is required.', null, 422);
            }

            // Find valid OTP
            $otpRecord = \App\Modules\Admin\Models\Otp::where('identifier', $phone)
                ->where('token', $validated['otp'])
                ->where('expires_at', '>', now())
                ->first();

            if (!$otpRecord) {
                return $this->sendError('Invalid or expired OTP.', null, 400);
            }

            // Delete ALL OTPs for this user to prevent reuse
            if ($otpRecord->user_id) {
                // Delete all OTPs for this user by user_id
                \App\Modules\Admin\Models\Otp::where('user_id', $otpRecord->user_id)->delete();
            } else {
                // If no user_id, delete all OTPs for this phone number
                \App\Modules\Admin\Models\Otp::where('identifier', $phone)->delete();
            }

            // Get user
            $user = User::where('phone', $phone)->first();
            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            // Set phone_verified_at timestamp when OTP is successfully verified
            if (is_null($user->phone_verified_at)) {
                $user->phone_verified_at = now();
                $user->save();
            }

            // Delete existing tokens and create new token for authenticated access
            $user->tokens()->delete();

            // Get the AUTH_MODEL class for token creation
            $authModel = config('auth.providers.users.model');
            $userForToken = $authModel::find($user->id);

            // Create new token using the correct user model
            $token = $userForToken->createToken('auth-token')->plainTextToken;

            // Load role with permissions for the frontend
            // This is required for the sidebar navigation and permission checking
            $user->load(['role.permissions']);

            return $this->sendSuccess([
                'user' => $user->makeHidden(['password']),
                'token' => $token,
                'tokenType' => 'Bearer'
            ], 'Phone number verified successfully.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('OTP verification error', ['error' => $e->getMessage()]);
            return $this->sendError('OTP verification failed. Please try again.', null, 500);
        }
    }

    /**
     * Send reset OTP.
     */
    public function sendResetOtp(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'login_id' => 'nullable|string|regex:/^[0-9]{11}$/',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
            ]);

            $phone = $validated['login_id'] ?? $validated['phone'] ?? null;

            if (!$phone) {
                return $this->sendError('Phone number or Login ID is required.', null, 422);
            }

            $user = User::where('phone', $phone)->first();
            if (!$user) {
                return $this->sendError('User not found with this phone number.', null, 404);
            }

            // Generate OTP for password reset
            $otp = $this->generateOtp($phone, 'password_reset', $user->id);

            return $this->sendSuccess([
                'phone' => $phone,
                'message' => 'Password reset OTP sent to your phone'
            ], 'OTP has been sent for password reset.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Send reset OTP error', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to send reset OTP. Please try again.', null, 500);
        }
    }

    /**
     * Reset password with OTP.
     */
    public function resetPassword(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'login_id' => 'nullable|string|regex:/^[0-9]{11}$/',
                'phone' => 'nullable|string|regex:/^[0-9]{11}$/',
                'otp' => 'required|string|size:5',
                'password' => 'required|string|min:6|confirmed',
            ]);

            $phone = $validated['login_id'] ?? $validated['phone'] ?? null;

            if (!$phone) {
                return $this->sendError('Phone number or Login ID is required.', null, 422);
            }

            // Verify OTP
            $otpRecord = \App\Modules\Admin\Models\Otp::where('identifier', $phone)
                ->where('token', $validated['otp'])
                ->where('expires_at', '>', now())
                ->first();

            if (!$otpRecord) {
                return $this->sendError('Invalid or expired OTP.', null, 400);
            }

            // Update user password
            $user = User::where('phone', $phone)->first();
            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            $user->update([
                'password' => Hash::make($validated['password'])
            ]);

            // Delete ALL OTPs for this user to prevent reuse
            if ($otpRecord->user_id) {
                // Delete all OTPs for this user by user_id
                \App\Modules\Admin\Models\Otp::where('user_id', $otpRecord->user_id)->delete();
            } else {
                // If no user_id, delete all OTPs for this phone number
                \App\Modules\Admin\Models\Otp::where('identifier', $phone)->delete();
            }

            return $this->sendSuccess(null, 'Password reset successful. Please login with your new password.');

        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Reset password error', ['error' => $e->getMessage()]);
            return $this->sendError('Password reset failed. Please try again.', null, 500);
        }
    }

    /**
     * Logout user and invalidate token.
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            // Get authenticated user via Sanctum
            $user = $request->user();

            if ($user) {
                // Delete current access token
                $request->user()->currentAccessToken()->delete();
            }

            // Create response that clears the auth cookie
            $response = $this->sendSuccess(null, 'Logged out successfully.');

            // Get the origin domain from the request (Next.js proxy forwards the origin)
            $host = $request->headers->get('x-forwarded-host') ?: $request->getHost();
            $cookieDomain = null;

            // Extract domain for local development
            if (str_contains($host, 'hooknhunt-api.test')) {
                $cookieDomain = '.hooknhunt-api.test';
            } elseif (str_contains($host, 'localhost')) {
                $cookieDomain = null; // Localhost doesn't need domain
            }

            $isSecure = $request->secure() || str_contains($host, 'hooknhunt-api.test');
            $cookie = cookie('auth_token', '', -1, '/', $cookieDomain, $isSecure, true, false, 'Lax');
            $response->withCookie($cookie);

            return $response;

        } catch (\Exception $e) {
            Log::error('Logout error', ['error' => $e->getMessage()]);
            return $this->sendError('Logout failed. Please try again.', null, 500);
        }
    }

    /**
     * Get authenticated user profile with permissions.
     * Used by frontend usePermissions hook to refresh permissions.
     */
    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            // Load role with permissions for the frontend
            // This is required for the sidebar navigation and permission checking
            $user->load(['role.permissions']);

            return $this->sendSuccess([
                'user' => $user->makeHidden(['password']),
            ], 'Profile retrieved successfully.');
        } catch (\Exception $e) {
            Log::error('Profile error', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to retrieve profile. Please try again.', null, 500);
        }
    }

    /**
     * Update user profile.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            $validated = $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'email' => 'sometimes|required|email|unique:users,email,' . $user->id,
                'phone' => 'sometimes|required|string|regex:/^[0-9]{11}$/|unique:users,phone,' . $user->id,
                'whatsapp_number' => 'nullable|string|regex:/^[0-9]{11}$/',
            ]);

            $user->update($validated);

            // Load role with permissions for the frontend
            $user->load(['role.permissions']);

            return $this->sendSuccess([
                'user' => $user->makeHidden(['password']),
            ], 'Profile updated successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Update profile error', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to update profile. Please try again.', null, 500);
        }
    }

    /**
     * Change user password.
     */
    public function changePassword(Request $request): JsonResponse
    {
        try {
            $user = $request->user();

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            $validated = $request->validate([
                'current_password' => 'required|string',
                'password' => 'required|string|min:6|confirmed',
            ]);

            if (!Hash::check($validated['current_password'], $user->password)) {
                return $this->sendError('Current password is incorrect.', null, 422);
            }

            $user->update([
                'password' => Hash::make($validated['password'])
            ]);

            return $this->sendSuccess(null, 'Password changed successfully.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->sendError('Validation failed.', $e->errors(), 422);
        } catch (\Exception $e) {
            Log::error('Change password error', ['error' => $e->getMessage()]);
            return $this->sendError('Failed to change password. Please try again.', null, 500);
        }
    }

    /**
     * Test SMS balance (development only).
     */
    public function testSmsBalance(Request $request): JsonResponse
    {
        return $this->sendSuccess([
            'balance' => 'test',
            'status' => 'SMS service working'
        ], 'SMS balance test endpoint', 200);
    }

    /**
     * Generate OTP for a phone number.
     */
    protected function generateOtp(string $phone, string $type, ?int $userId = null): string
    {
        // Generate 5-digit OTP
        $otp = str_pad((string) random_int(0, 99999), 5, '0', STR_PAD_LEFT);

        // Store OTP in database
        \App\Modules\Admin\Models\Otp::create([
            'user_id' => $userId,
            'identifier' => $phone,
            'token' => $otp,
            'expires_at' => now()->addMinutes(15), // OTP valid for 15 minutes
        ]);

        return $otp;
    }
}
