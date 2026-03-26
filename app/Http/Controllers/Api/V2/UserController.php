<?php

namespace App\Http\Controllers\Api\V2; // Namespace updated to V2

use App\Http\Controllers\Controller;
use App\Http\Requests\ApiRequest; // আমাদের তৈরি করা সেই সিকিউর বেস রিকোয়েস্ট
use App\Models\User;
use App\Models\CustomerProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\JsonResponse;
use App\Models\Role;
use App\Traits\ApiResponse;
use App\Services\AlphaSmsService;



class UserController extends Controller
{
    use ApiResponse;

    /**
     * অ্যাডমিন প্যানেলের জন্য ইউজার লিস্ট (কাস্টমার বাদে বাকি স্টাফরা)
     */
   // ১. ইউজার লিস্ট (ফিল্টারসহ)
/**
     * Display a listing of Users (Isolated Staff or Customer)
     */
    public function index(Request $request)
    {
        $type = $request->query('type'); // 'staff' or 'customer'
        $search = $request->query('search'); // Search query
        $customerType = $request->query('customer_type'); // 'retail' or 'wholesale' for customers

        // Advanced filters
        $status = $request->query('status'); // 'active' or 'inactive'
        $location = $request->query('location'); // Division filter
        $cities = $request->query('cities'); // Comma-separated cities
        $minSpent = $request->query('min_spent'); // Minimum total spent
        $maxSpent = $request->query('max_spent'); // Maximum total spent
        $minOrders = $request->query('min_orders'); // Minimum orders
        $maxOrders = $request->query('max_orders'); // Maximum orders
        $minLoyaltyPoints = $request->query('min_loyalty_points'); // Minimum loyalty points
        $maxLoyaltyPoints = $request->query('max_loyalty_points'); // Maximum loyalty points
        $vipStatus = $request->query('vip_status'); // 'vip' or 'regular'
        $registrationDateFrom = $request->query('registration_date_from'); // Date range start
        $registrationDateTo = $request->query('registration_date_to'); // Date range end
        $lastPurchaseFrom = $request->query('last_purchase_from'); // Last purchase date range start
        $lastPurchaseTo = $request->query('last_purchase_to'); // Last purchase date range end

        $query = User::with('role', 'customerProfile');

        if ($type === 'staff') {
            // শুধুমাত্র স্টাফ রোলগুলো ফিল্টার (কাস্টমার বাদে বাকি সব)
            $query->whereHas('role', function($q) {
                $q->whereNotIn('id', [10, 11]); // Exclude customer roles
            });
        } elseif ($type === 'customer') {
            // শুধুমাত্র কাস্টমার রোলগুলো ফিল্টার
            $query->whereHas('role', function($q) {
                $q->whereIn('id', [10, 11]); // Include customer roles
            });

            // Filter by customer type if specified (retail/wholesale)
            if ($customerType && in_array($customerType, ['retail', 'wholesale'])) {
                $roleId = $customerType === 'retail' ? 10 : 11;
                $query->where('role_id', $roleId);
            }
        } else {
            // যদি টাইপ না থাকে, তবে সিকিউরিটির জন্য খালি রেজাল্ট পাঠানোই প্রফেশনালিজম
            return $this->sendError('User type is required (staff or customer).', null, 400);
        }

        // Status filter (active/inactive)
        if ($status && in_array($status, ['active', 'inactive'])) {
            $query->where('is_active', $status === 'active');
        }

        // Search functionality - search in name, email, phone, and address
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

        // Location filter - Division
        if ($location) {
            $query->whereHas('customerProfile', function($q) use ($location) {
                $q->where('division', $location);
            });
        }

        // Cities filter (comma-separated)
        if ($cities) {
            $cityArray = explode(',', $cities);
            $query->whereHas('customerProfile', function($q) use ($cityArray) {
                $q->whereIn('district', $cityArray);
            });
        }

        // Purchase history filters - Total Spent
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

        // Purchase history filters - Number of Orders
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

        $perPage = $request->query('per_page', 20);
        return $this->sendSuccess($query->latest()->paginate($perPage), ucfirst($type) . ' list retrieved.');
    }

    /**
     * Store a User (With Strict Role Enforcement)
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|unique:users,phone',
            'role_id' => 'required|exists:roles,id',
            'password' => 'required|min:6',
            'type' => 'required|in:staff,customer', // রিকোয়েস্টে টাইপ থাকা বাধ্যতামূলক
            'email' => 'nullable|email|unique:users,email',

            // Profile fields (optional)
            'profile' => 'nullable|array',
            'profile.department_id' => 'nullable|exists:departments,id',
            'profile.designation' => 'nullable|string|max:255',
            'profile.joining_date' => 'nullable|date',
            'profile.base_salary' => 'nullable|numeric',
            'profile.address' => 'nullable|string',
            'profile.division' => 'nullable|string',
            'profile.district' => 'nullable|string',
            'profile.thana' => 'nullable|string',
            'profile.dob' => 'nullable|date',
            'profile.gender' => 'nullable|in:male,female,other',
            'profile.type' => 'nullable|in:retail,wholesale',
            'profile.trade_license_no' => 'nullable|string',
            'profile.tax_id' => 'nullable|string',

            // Customer profile fields (optional)
            'customer_profile' => 'nullable|array',
            'customer_profile.source' => 'nullable|string',
            'customer_profile.medium' => 'nullable|string',
            'customer_profile.referral_code' => 'nullable|string',
            'customer_profile.preferred_language' => 'nullable|string',
            'customer_profile.preferred_currency' => 'nullable|string',
            'customer_profile.marketing_consent' => 'nullable|boolean',
            'customer_profile.do_not_contact' => 'nullable|boolean',
            'customer_profile.type' => 'nullable|in:retail,wholesale',
            'customer_profile.trade_license_no' => 'nullable|string',
            'customer_profile.tax_id' => 'nullable|string',
            'customer_profile.notes' => 'nullable|string',
        ]);

        $role = Role::find($request->role_id);

        // Debug logging
        \Log::info('Creating user', [
            'role_id' => $request->role_id,
            'role_slug' => $role ? $role->slug : 'not found',
            'type' => $request->type,
        ]);

        // ভ্যালিডেশন: স্টাফ রোলে কাস্টমার বা কাস্টমার রোলে স্টাফ ঢুকছে কি না চেক
        if ($request->type === 'staff' && in_array($role->id, [10, 11])) {
            return $this->sendError('Invalid role assigned for a Staff user.', null, 422);
        }

        if ($request->type === 'customer' && !in_array($role->id, [10, 11])) {
            \Log::error('Invalid role for customer', [
                'role_id' => $request->role_id,
                'role_id' => $role->id,
                'allowed_role_ids' => [10, 11]
            ]);
            return $this->sendError('Invalid role assigned for a Customer.', null, 422);
        }

        // Plain password for SMS
        $plainPassword = $request->password;

        $user = User::create([
            'name' => strip_tags($request->name),
            'phone' => $request->phone,
            'email' => $request->email,
            'password' => Hash::make($plainPassword),
            'role_id' => $request->role_id,
            'is_active' => true,
            'phone_verified_at' => now(), // Auto-verify for admin-created users
        ]);

        // Create staff profile if provided
        if ($request->type === 'staff' && $request->has('profile') && is_array($request->profile)) {
            $user->profile()->create($request->profile);
        }

        // Create customer profile if provided
        if ($request->type === 'customer') {
            $customerProfileData = $request->input('customer_profile', []);

            // Merge personal info from profile if provided
            if ($request->has('profile') && is_array($request->profile)) {
                $profileData = $request->profile;
                $customerProfileData['dob'] = $profileData['dob'] ?? null;
                $customerProfileData['gender'] = $profileData['gender'] ?? null;
                $customerProfileData['address'] = $profileData['address'] ?? null;
                $customerProfileData['division'] = $profileData['division'] ?? null;
                $customerProfileData['district'] = $profileData['district'] ?? null;
                $customerProfileData['thana'] = $profileData['thana'] ?? null;
                // Merge business info from profile
                $customerProfileData['trade_license_no'] = $profileData['trade_license_no'] ?? null;
                $customerProfileData['tax_id'] = $profileData['tax_id'] ?? null;
            }

            // Set default values (only if not already provided)
            $customerProfileData['type'] = $customerProfileData['type'] ?? 'retail';
            $customerProfileData['preferred_language'] = $customerProfileData['preferred_language'] ?? 'en';
            $customerProfileData['preferred_currency'] = $customerProfileData['preferred_currency'] ?? 'BDT';
            $customerProfileData['marketing_consent'] = $customerProfileData['marketing_consent'] ?? false;
            $customerProfileData['do_not_contact'] = $customerProfileData['do_not_contact'] ?? false;
            $customerProfileData['loyalty_tier'] = 'bronze';
            $customerProfileData['loyalty_points'] = 0;
            $customerProfileData['source'] = $customerProfileData['source'] ?? 'admin';

            // Debug logging
            \Log::info('Creating customer profile', [
                'customer_profile_data' => $customerProfileData,
                'request_customer_profile' => $request->input('customer_profile'),
                'request_profile' => $request->input('profile'),
            ]);

            // Create customer profile
            $user->customerProfile()->create($customerProfileData);

            // Send password via SMS
            $this->sendPasswordSms($user->phone, $plainPassword, $user->name);
        }

        return $this->sendSuccess(
            $user->load('role', 'customerProfile'),
            ucfirst($request->type) . ' created successfully.',
            201
        );
    }

    /**
     * Send password via SMS to customer
     */
    private function sendPasswordSms(string $phone, string $password, string $name): void
    {
        try {
            $smsService = new AlphaSmsService();

            $message = "Dear {$name}, your account has been created successfully. Your login password is: {$password} Please login at https://hooknhunt.com";

            $smsService->sendSms($message, $phone);
        } catch (\Exception $e) {
            // Log error but don't fail the request
            \Log::error('Failed to send password SMS', [
                'phone' => $phone,
                'error' => $e->getMessage()
            ]);
        }
    }
    // ৩. ইউজার আপডেট (রোল এবং পারমিশন পরিবর্তন)
   public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Validation
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone,' . $id,
            'email' => 'nullable|email|unique:users,email,' . $id,
            'role_id' => 'required|exists:roles,id',
            'is_active' => 'sometimes|boolean',
            'password' => 'nullable|min:6',

            // Profile fields (optional) - for backward compatibility with staff
            'department_id' => 'nullable|exists:departments,id',
            'designation' => 'nullable|string|max:255',
            'joining_date' => 'nullable|date',
            'base_salary' => 'nullable|numeric',
            'address' => 'nullable|string',
            'city' => 'nullable|string',
            'dob' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',

            // Nested profile and customer_profile support
            'profile' => 'nullable|array',
            'profile.type' => 'nullable|string',
            'profile.trade_license_no' => 'nullable|string',
            'profile.tax_id' => 'nullable|string',
            'profile.dob' => 'nullable|date',
            'profile.gender' => 'nullable|in:male,female,other',
            'profile.address' => 'nullable|string',
            'profile.division' => 'nullable|string',
            'profile.district' => 'nullable|string',
            'profile.thana' => 'nullable|string',

            // Customer profile fields (optional)
            'customer_profile' => 'nullable|array',
            'customer_profile.source' => 'nullable|string',
            'customer_profile.medium' => 'nullable|string',
            'customer_profile.referral_code' => 'nullable|string',
            'customer_profile.preferred_language' => 'nullable|string',
            'customer_profile.preferred_currency' => 'nullable|string',
            'customer_profile.marketing_consent' => 'nullable|boolean',
            'customer_profile.do_not_contact' => 'nullable|boolean',
            'customer_profile.type' => 'nullable|in:retail,wholesale',
            'customer_profile.trade_license_no' => 'nullable|string',
            'customer_profile.tax_id' => 'nullable|string',
            'customer_profile.notes' => 'nullable|string',
        ]);

        // Update user basic fields
        if($request->has('role_id')) {
            $user->role_id = $validated['role_id'];
        }
        if($request->has('name')) {
            $user->name = $validated['name'];
        }
        if($request->has('phone')) {
            $user->phone = $validated['phone'];
        }
        if($request->has('email')) {
            $user->email = $validated['email'];
        }
        if($request->has('is_active')) {
            $user->is_active = $validated['is_active'];
        }
        if($request->has('password') && !empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
        }

        $user->save();

        // Handle nested profile data (new format from frontend)
        if ($request->has('profile') && is_array($request->profile)) {
            $profileData = $request->profile;

            // Check if user is a customer (has customerProfile)
            if ($user->customerProfile) {
                // Update customer profile with address info
                $customerProfileData = [];

                // Personal info
                $customerProfileData['dob'] = $profileData['dob'] ?? null;
                $customerProfileData['gender'] = $profileData['gender'] ?? null;
                $customerProfileData['address'] = $profileData['address'] ?? null;
                $customerProfileData['division'] = $profileData['division'] ?? null;
                $customerProfileData['district'] = $profileData['district'] ?? null;
                $customerProfileData['thana'] = $profileData['thana'] ?? null;

                // Business info
                $customerProfileData['trade_license_no'] = $profileData['trade_license_no'] ?? null;
                $customerProfileData['tax_id'] = $profileData['tax_id'] ?? null;

                // Remove empty values
                $customerProfileData = array_filter($customerProfileData, function($value) {
                    return $value !== null && $value !== '';
                });

                if (!empty($customerProfileData)) {
                    $user->customerProfile()->update($customerProfileData);
                }
            }
        }

        // Handle customer_profile nested data
        if ($request->has('customer_profile') && is_array($request->customer_profile)) {
            $customerProfileData = $request->customer_profile;

            // Remove empty values
            $customerProfileData = array_filter($customerProfileData, function($value) {
                return $value !== null && $value !== '';
            });

            if (!empty($customerProfileData)) {
                if ($user->customerProfile) {
                    $user->customerProfile()->update($customerProfileData);
                } else {
                    $user->customerProfile()->create($customerProfileData);
                }
            }
        }

        // Handle legacy root-level profile fields (for staff profile backward compatibility)
        $profileFields = ['department_id', 'designation', 'joining_date', 'base_salary', 'address', 'city', 'dob', 'gender'];
        $hasProfileData = false;

        foreach ($profileFields as $field) {
            if ($request->has($field) && !is_null($validated[$field])) {
                $hasProfileData = true;
                break;
            }
        }

        if ($hasProfileData) {
            $profileData = [];

            // Build profile data from request
            foreach ($profileFields as $field) {
                if ($request->has($field)) {
                    $profileData[$field] = $validated[$field] ?? null;
                }
            }

            // Update existing profile or create new one (for staff)
            if ($user->profile) {
                $user->profile()->update($profileData);
            } else {
                $user->profile()->create($profileData);
            }
        }

        return response()->json([
            'status' => true,
            'message' => 'User updated successfully.',
            'data' => $user->load('role', 'profile', 'customerProfile')
        ]);
    }

    // ৪. ইউজার ব্যান/অ্যাক্টিভ করা
    public function banUser($id)
    {
        $user = User::findOrFail($id);
        $user->update(['is_active' => !$user->is_active]);
        
        $status = $user->is_active ? 'activated' : 'banned';
        return $this->sendSuccess(null, "User has been {$status}.");
    }

    // ৫. রোল লিস্ট (ড্রপডাউনের জন্য)
    public function roleList(Request $request)
    {
        $type = $request->query('type'); // 'staff' or 'customer'

        $query = Role::query();

        if ($type === 'staff') {
            // শুধুমাত্র স্টাফ রোলগুলো ফিল্টার (কাস্টমার বাদে বাকি সব)
            $query->whereNotIn('id', [10, 11]); // Exclude customer roles
        } elseif ($type === 'customer') {
            // শুধুমাত্র কাস্টমার রোলগুলো ফিল্টার
            $query->whereIn('id', [10, 11]); // Include customer roles
        }

        return $this->sendSuccess($query->get(), 'Roles retrieved.');
    }

    // ৬. ডিলিট
    public function destroy(User $user)
    {
        try {
            if ($user->id === auth()->id()) {
                return $this->sendError('You cannot delete yourself.', null, 400);
            }
            $user->delete();
            return $this->sendSuccess(null, 'User deleted successfully.');
        } catch (\Exception $e) {
            \Log::error('Error deleting user', [
                'user_id' => $user->id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError('Failed to delete user: ' . $e->getMessage(), null, 500);
        }
    }

    public function blockPermission(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $permissionId = $request->permission_id;

        // syncWithoutDetaching ব্যবহার করে is_blocked ১ করে দিন
        $user->directPermissions()->syncWithoutDetaching([
            $permissionId => ['is_blocked' => true]
        ]);

        return response()->json([
            'status' => true,
            'message' => 'পারমিশনটি এই ইউজারের জন্য ব্লক করা হয়েছে।',
        ]);
    }

    public function giveDirectPermission(Request $request, $userId)
    {
        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        $user = User::findOrFail($userId);
        // sync ব্যবহার করলে আগের পারমিশন মুছে নতুনগুলো বসবে
        $user->directPermissions()->sync($request->permissions);

        return $this->sendSuccess(null, 'Personal permissions updated for ' . $user->name);
    }

    public function show($id)
    {
        try {
            $user = \App\Models\User::with([
                'role.permissions:id,name,slug,group_name',
                'directPermissions' => function ($query) {
                    $query->select('permissions.id', 'permissions.name', 'permissions.slug', 'permissions.group_name')
                          ->withPivot('is_blocked');
                },
                'staffProfile.department', // Load staff profile with department
                'customerProfile' // Load customer profile
            ])->findOrFail($id);

            // ১. রোলের পারমিশন থেকে pivot হাইড করা
            if ($user->role) {
                $user->role->permissions->makeHidden('pivot');
            }

            // ২. Separate granted and blocked permissions BEFORE hiding pivot
            $grantedPermissions = $user->directPermissions->filter(function ($perm) {
                return isset($perm->pivot) && $perm->pivot->is_blocked == 0;
            })->makeHidden(['pivot', 'id']);

            $blockedPermissions = $user->directPermissions->filter(function ($perm) {
                return isset($perm->pivot) && $perm->pivot->is_blocked == 1;
            })->makeHidden(['pivot', 'id']);

            // ৩. Hide pivot from remaining directPermissions
            $user->directPermissions->makeHidden('pivot');

            // Role permissions (for reference)
            $rolePermissions = $user->role ? $user->role->permissions : collect([]);

            return response()->json([
                'status' => true,
                'message' => 'User details retrieved.',
                'data' => [
                    'user' => $user,
                    'role_permissions' => $rolePermissions,
                    'granted_permissions' => $grantedPermissions,
                    'blocked_permissions' => $blockedPermissions,
                ],
                'errors' => null
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'User not found.',
                'errors' => $e->getMessage(),
                'data' => null
            ], 404);
        }
    }

    // ৭. Sync granted permissions
    public function syncGrantedPermissions(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        // Sync with is_blocked = 0
        $user->directPermissions()->syncWithPivotValues(
            $request->permissions,
            ['is_blocked' => 0]
        );

        return $this->sendSuccess(null, 'Granted permissions updated.');
    }

    // ৮. Sync blocked permissions
    public function syncBlockedPermissions(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        // Sync with is_blocked = 1
        $user->directPermissions()->syncWithPivotValues(
            $request->permissions,
            ['is_blocked' => 1]
        );

        return $this->sendSuccess(null, 'Blocked permissions updated.');
    }

}