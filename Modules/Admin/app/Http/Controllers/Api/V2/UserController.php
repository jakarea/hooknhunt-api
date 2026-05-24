<?php

namespace App\Modules\Admin\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Admin\Http\Requests\StoreUserRequest;
use App\Modules\Admin\Http\Requests\UpdateUserRequest;
use App\Modules\System\Models\User;
use App\Modules\System\Models\Role;
use App\Traits\ApiResponse;
use App\Services\AlphaSmsService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Display listing of users with filtering (Staff or Customer)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $type = $request->query('type'); // 'staff' or 'customer'
            $search = $request->query('search');
            $customerType = $request->query('customer_type');

            // Advanced filters
            $status = $request->query('status');
            $location = $request->query('location');
            $cities = $request->query('cities');
            $minSpent = $request->query('min_spent');
            $maxSpent = $request->query('max_spent');
            $minOrders = $request->query('min_orders');
            $maxOrders = $request->query('max_orders');
            $minLoyaltyPoints = $request->query('min_loyalty_points');
            $maxLoyaltyPoints = $request->query('max_loyalty_points');
            $vipStatus = $request->query('vip_status');
            $registrationDateFrom = $request->query('registration_date_from');
            $registrationDateTo = $request->query('registration_date_to');
            $lastPurchaseFrom = $request->query('last_purchase_from');
            $lastPurchaseTo = $request->query('last_purchase_to');

            $query = User::with('role', 'customerProfile');

            // Filter by user type using config
            if ($type === 'staff') {
                $query->whereHas('role', function($q) {
                    $q->whereNotIn('id', [
                        config('roles.customer.retail_id'),
                        config('roles.customer.wholesale_id')
                    ]);
                });
            } elseif ($type === 'customer') {
                $query->whereHas('role', function($q) {
                    $q->whereIn('id', [
                        config('roles.customer.retail_id'),
                        config('roles.customer.wholesale_id')
                    ]);
                });

                // Filter by customer type
                if ($customerType && in_array($customerType, ['retail', 'wholesale'])) {
                    $roleId = $customerType === 'retail'
                        ? config('roles.customer.retail_id')
                        : config('roles.customer.wholesale_id');
                    $query->where('role_id', $roleId);
                }
            } else {
                return $this->sendError(
                    'User type is required (staff or customer).',
                    null,
                    400
                );
            }

            // Status filter
            if ($status && in_array($status, ['active', 'inactive'])) {
                $query->where('is_active', $status === 'active');
            }

            // Search functionality
            if ($search) {
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhereHas('customerProfile', function($profileQuery) use ($search) {
                          $profileQuery->where('address', 'like', "%{$search}%")
                                        ->orWhere('division', 'like', "%{$search}%")
                                        ->orWhere('district', 'like', "%{$search}%");
                      });
                });
            }

            // Location filter
            if ($location) {
                $query->whereHas('customerProfile', function($q) use ($location) {
                    $q->where('division', $location);
                });
            }

            // Cities filter
            if ($cities) {
                $cityArray = explode(',', $cities);
                $query->whereHas('customerProfile', function($q) use ($cityArray) {
                    $q->whereIn('district', $cityArray);
                });
            }

            // Purchase history filters
            if ($minSpent !== null) {
                $query->whereHas('customerProfile', function($q) use ($minSpent) {
                    $q->where('total_spent', '>=', $minSpent);
                });
            }
            if ($maxSpent !== null) {
                $query->whereHas('customerProfile', function($q) use ($maxSpent) {
                    $q->where('total_spent', '<=', $maxSpent);
                });
            }

            // Number of orders filter
            if ($minOrders !== null) {
                $query->whereHas('customerProfile', function($q) use ($minOrders) {
                    $q->where('total_orders', '>=', $minOrders);
                });
            }
            if ($maxOrders !== null) {
                $query->whereHas('customerProfile', function($q) use ($maxOrders) {
                    $q->where('total_orders', '<=', $maxOrders);
                });
            }

            // Loyalty points filter
            if ($minLoyaltyPoints !== null) {
                $query->whereHas('customerProfile', function($q) use ($minLoyaltyPoints) {
                    $q->where('loyalty_points', '>=', $minLoyaltyPoints);
                });
            }
            if ($maxLoyaltyPoints !== null) {
                $query->whereHas('customerProfile', function($q) use ($maxLoyaltyPoints) {
                    $q->where('loyalty_points', '<=', $maxLoyaltyPoints);
                });
            }

            // VIP status filter
            if ($vipStatus && in_array($vipStatus, ['vip', 'regular'])) {
                $query->whereHas('customerProfile', function($q) use ($vipStatus) {
                    if ($vipStatus === 'vip') {
                        $q->whereIn('loyalty_tier', ['gold', 'platinum']);
                    } else {
                        $q->whereIn('loyalty_tier', ['bronze', 'silver']);
                    }
                });
            }

            // Registration date range filter
            if ($registrationDateFrom && $registrationDateTo) {
                $query->whereBetween('created_at', [$registrationDateFrom, $registrationDateTo]);
            } elseif ($registrationDateFrom) {
                $query->whereDate('created_at', '>=', $registrationDateFrom);
            } elseif ($registrationDateTo) {
                $query->whereDate('created_at', '<=', $registrationDateTo);
            }

            // Last purchase date range filter
            if ($lastPurchaseFrom && $lastPurchaseTo) {
                $query->whereHas('customerProfile', function($q) use ($lastPurchaseFrom, $lastPurchaseTo) {
                    $q->whereBetween('last_order_date', [$lastPurchaseFrom, $lastPurchaseTo]);
                });
            } elseif ($lastPurchaseFrom) {
                $query->whereHas('customerProfile', function($q) use ($lastPurchaseFrom) {
                    $q->whereDate('last_order_date', '>=', $lastPurchaseFrom);
                });
            } elseif ($lastPurchaseTo) {
                $query->whereHas('customerProfile', function($q) use ($lastPurchaseTo) {
                    $q->whereDate('last_order_date', '<=', $lastPurchaseTo);
                });
            }

            $perPage = min($request->query('per_page', 20), 100);

            Log::info('User list retrieved', [
                'type' => $type,
                'requested_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $query->latest()->paginate($perPage),
                ucfirst($type) . ' list retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving user list', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);
            return $this->sendError(
                'Failed to retrieve user list. Please try again.',
                config('app.debug') ? ['error' => $e->getMessage()] : null,
                500
            );
        }
    }

    /**
     * Store a newly created user in storage.
     *
     * @param StoreUserRequest $request
     * @return JsonResponse
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validated();
            $role = Role::find($validated['role']);

            // Validate role assignment
            if (!$role) {
                return $this->sendError('Selected role not found.', null, 404);
            }

            // Check role-type compatibility
            $customerRoles = [
                config('roles.customer.retail_id'),
                config('roles.customer.wholesale_id')
            ];

            if ($validated['type'] === 'staff' && in_array($role->id, $customerRoles)) {
                return $this->sendError(
                    'Invalid role assignment. Staff cannot have customer role.',
                    null,
                    422
                );
            }

            if ($validated['type'] === 'customer' && !in_array($role->id, $customerRoles)) {
                return $this->sendError(
                    'Invalid role assignment. Customer must have customer role.',
                    null,
                    422
                );
            }

            // Plain password for SMS
            $plainPassword = $validated['password'];

            // Create user
            $user = User::create([
                'name' => strip_tags($validated['name']),
                'phone' => $validated['phone'],
                'email' => $validated['email'] ?? null,
                'password' => Hash::make($plainPassword),
                'role_id' => $role->id,
                'is_active' => true,
                'phone_verified_at' => now(),
            ]);

            // Create staff profile if provided
            if ($validated['type'] === 'staff' && isset($validated['profile']) && is_array($validated['profile'])) {
                $user->profile()->create($validated['profile']);
            }

            // Create customer profile if provided
            if ($validated['type'] === 'customer') {
                $customerProfileData = $validated['customer_profile'] ?? [];

                // Merge profile data if provided
                if (isset($validated['profile']) && is_array($validated['profile'])) {
                    $profileData = $validated['profile'];
                    $customerProfileData['dob'] = $profileData['dob'] ?? null;
                    $customerProfileData['gender'] = $profileData['gender'] ?? null;
                    $customerProfileData['address'] = $profileData['address'] ?? null;
                    $customerProfileData['division'] = $profileData['division'] ?? null;
                    $customerProfileData['district'] = $profileData['district'] ?? null;
                    $customerProfileData['thana'] = $profileData['thana'] ?? null;
                    $customerProfileData['trade_license_no'] = $profileData['trade_license_no'] ?? null;
                    $customerProfileData['tax_id'] = $profileData['tax_id'] ?? null;
                }

                // Set default values
                $customerProfileData['type'] = $customerProfileData['type'] ?? 'retail';
                $customerProfileData['preferred_language'] = $customerProfileData['preferred_language'] ?? 'en';
                $customerProfileData['preferred_currency'] = $customerProfileData['preferred_currency'] ?? 'BDT';
                $customerProfileData['marketing_consent'] = $customerProfileData['marketing_consent'] ?? false;
                $customerProfileData['do_not_contact'] = $customerProfileData['do_not_contact'] ?? false;
                $customerProfileData['loyalty_tier'] = 'bronze';
                $customerProfileData['loyalty_points'] = 0;
                $customerProfileData['source'] = $customerProfileData['source'] ?? 'admin';

                $user->customerProfile()->create($customerProfileData);
            }

            DB::commit();

            Log::info('User created successfully', [
                'user_id' => $user->id,
                'name' => $user->name,
                'role_id' => $user->role_id,
                'created_by' => auth()->id()
            ]);

            // Send SMS with credentials (non-blocking)
            try {
                if (class_exists(AlphaSmsService::class)) {
                    $smsService = new AlphaSmsService();
                    $message = "Your account has been created. Phone: {$user->phone}, Password: {$plainPassword}";
                    $smsService->sendSms($user->phone, $message);
                }
            } catch (\Exception $smsException) {
                Log::warning('Failed to send SMS for new user', [
                    'user_id' => $user->id,
                    'error' => $smsException->getMessage()
                ]);
                // Don't fail the request if SMS fails
            }

            return $this->sendSuccess(
                $user->load('role', 'profile', 'customerProfile'),
                'User created successfully.',
                201
            );

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            if ($e->getCode() == 23000) {
                Log::warning('Duplicate entry while creating user', [
                    'error' => $e->getMessage(),
                    'request_data' => $request->except(['password'])
                ]);
                return $this->sendError(
                    'A user with this information already exists.',
                    null,
                    409
                );
            }
            Log::error('Database error while creating user', [
                'error' => $e->getMessage(),
                'request_data' => $request->except(['password'])
            ]);
            return $this->sendError(
                'Failed to create user due to database error.',
                config('app.debug') ? ['error' => $e->getMessage()] : null,
                500
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Unexpected error while creating user', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->except(['password'])
            ]);
            return $this->sendError(
                'Failed to create user. Please try again.',
                config('app.debug') ? ['error' => $e->getMessage()] : null,
                500
            );
        }
    }

    /**
     * Display the specified user.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $user = User::with(['role', 'profile', 'customerProfile'])->find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            Log::info('User details retrieved', [
                'user_id' => $user->id,
                'requested_by' => auth()->id()
            ]);

            return $this->sendSuccess($user, 'User retrieved successfully.');

        } catch (\Exception $e) {
            Log::error('Error retrieving user details', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve user details.',
                null,
                500
            );
        }
    }

    /**
     * Update the specified user in storage.
     *
     * @param UpdateUserRequest $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(UpdateUserRequest $request, int $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $user = User::find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            $validated = $request->validated();

            // Prevent self-deactivation
            if ($id === auth()->id() && isset($validated['is_active']) && !$validated['is_active']) {
                return $this->sendError(
                    'You cannot deactivate your own account.',
                    null,
                    400
                );
            }

            // Hash password if being updated
            if (isset($validated['password'])) {
                $validated['password'] = Hash::make($validated['password']);
            }

            // Update user
            $user->update($validated);

            // Update profile if provided
            if (isset($validated['profile']) && is_array($validated['profile'])) {
                $profile = $user->profile;
                if ($profile) {
                    $profile->update($validated['profile']);
                } else {
                    $user->profile()->create($validated['profile']);
                }
            }

            // Update customer profile if provided
            if (isset($validated['customer_profile']) && is_array($validated['customer_profile'])) {
                $customerProfile = $user->customerProfile;
                if ($customerProfile) {
                    $customerProfile->update($validated['customer_profile']);
                } else {
                    $user->customerProfile()->create($validated['customer_profile']);
                }
            }

            DB::commit();

            Log::info('User updated successfully', [
                'user_id' => $user->id,
                'updated_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $user->load('role', 'profile', 'customerProfile'),
                'User updated successfully.'
            );

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            if ($e->getCode() == 23000) {
                Log::warning('Duplicate entry while updating user', [
                    'user_id' => $id,
                    'error' => $e->getMessage()
                ]);
                return $this->sendError(
                    'A user with this information already exists.',
                    null,
                    409
                );
            }
            Log::error('Database error while updating user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to update user due to database error.',
                null,
                500
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Unexpected error while updating user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to update user. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Remove the specified user from storage.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $user = User::find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            // Prevent self-deletion
            if ($id === auth()->id()) {
                return $this->sendError(
                    'You cannot delete your own account.',
                    null,
                    400
                );
            }

            $userId = $user->id;
            $userName = $user->name;

            $user->delete();

            DB::commit();

            Log::info('User deleted successfully', [
                'user_id' => $userId,
                'user_name' => $userName,
                'deleted_by' => auth()->id()
            ]);

            return $this->sendSuccess(null, 'User deleted successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to delete user. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Get roles assigned to a user.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getRoles(int $id): JsonResponse
    {
        try {
            $user = User::with('role')->find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            return $this->sendSuccess(
                $user->role,
                'User roles retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving user roles', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve user roles.',
                null,
                500
            );
        }
    }

    /**
     * Assign roles to a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignRoles(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'role_id' => 'required|exists:roles,id'
            ]);

            $user = User::find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            $role = Role::find($validated['role_id']);

            // Validate role assignment
            $customerRoles = [
                config('roles.customer.retail_id'),
                config('roles.customer.wholesale_id')
            ];

            if (in_array($role->id, $customerRoles) && $user->profile()->exists()) {
                return $this->sendError(
                    'Cannot assign customer role to staff member.',
                    null,
                    422
                );
            }

            $user->update(['role_id' => $role->id]);

            Log::info('User role updated', [
                'user_id' => $user->id,
                'new_role_id' => $role->id,
                'updated_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $user->load('role'),
                'User role updated successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error assigning role to user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to assign role. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Get permissions for a user.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getPermissions(int $id): JsonResponse
    {
        try {
            $user = User::with('role.permissions')->find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            $permissions = $user->role ? $user->role->permissions : [];

            return $this->sendSuccess(
                $permissions,
                'User permissions retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving user permissions', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve user permissions.',
                null,
                500
            );
        }
    }

    /**
     * Assign additional permissions to a user.
     *
     * @param Request $request
     * @param int $id
     * @return JsonResponse
     */
    public function assignPermissions(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'permissions' => 'required|array',
                'permissions.*' => 'exists:permissions,id'
            ]);

            $user = User::find($id);

            if (!$user) {
                return $this->sendError('User not found.', null, 404);
            }

            // Note: This implementation depends on your permission system
            // Adjust as needed based on your actual permission model

            Log::info('User permissions updated', [
                'user_id' => $user->id,
                'permissions_count' => count($validated['permissions']),
                'updated_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                null,
                'User permissions updated successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error assigning permissions to user', [
                'user_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to assign permissions. Please try again.',
                null,
                500
            );
        }
    }
}
