<?php

namespace App\Http\Controllers\Api\V2\Hrm;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\StaffProfile;
use App\Services\AlphaSmsService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class StaffController extends Controller
{
    use ApiResponse;

    /**
     * List all Staff (Non-Customer Users)
     */
    public function index(Request $request)
    {
        // Permission check: Need hrm.staff.index permission
        if (!auth()->user()->hasPermissionTo('hrm.staff.index')) {
            return $this->sendError('You do not have permission to view staff.', null, 403);
        }

        // Load staff - exclude customer roles (10 = Retail Customer, 11 = Wholesale Customer)
        $query = User::with(['staffProfile.department', 'role'])
            ->whereHas('role', function($q) {
                $q->whereNotIn('id', [10, 11]); // Exclude customer roles
            });

        if ($request->department_id) {
            $query->whereHas('staffProfile', fn($q) => $q->where('department_id', $request->department_id));
        }

        return $this->sendSuccess($query->paginate(20), 'Staff list fetched');
    }

    /**
     * Create New Staff
     */
    public function store(Request $request)
    {
        // Permission check: Need hrm.staff.create permission
        if (!auth()->user()->hasPermissionTo('hrm.staff.create')) {
            return $this->sendError('You do not have permission to create staff.', null, 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|unique:users,phone',
            'email' => 'nullable|email|unique:users,email',
            'role_id' => 'required|exists:roles,id', // Must assign a role (e.g. Manager)

            // Staff Profile / HRM Fields
            'department_id' => 'required|exists:departments,id',
            'designation' => 'required|string',
            'base_salary' => 'required|numeric|min:0',
            'house_rent' => 'nullable|numeric|min:0',
            'medical_allowance' => 'nullable|numeric|min:0',
            'conveyance_allowance' => 'nullable|numeric|min:0',
            'overtime_hourly_rate' => 'nullable|numeric|min:0',
            'joining_date' => 'nullable|date',
            'address' => 'nullable|string',
            'division' => 'nullable|string',
            'district' => 'nullable|string',
            'thana' => 'nullable|string',
            'dob' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'office_email' => 'nullable|email',
            'whatsapp_number' => 'nullable|string',

            // Bank Account Information (for salary transfer)
            'bank_account_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_branch' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            // 1. Generate random 8-character alphanumeric password
            $generatedPassword = $this->generateRandomPassword();

            // 2. Create User Logic
            $user = User::create([
                'name' => $request->name,
                'phone' => $request->phone,
                'email' => $request->email,
                'password' => Hash::make($generatedPassword), // Use generated password
                'role_id' => $request->role_id,
                'is_active' => true,
                'phone_verified_at' => now() // Admin-created accounts are pre-verified
            ]);

            // 3. Send SMS with login credentials
            $smsService = new AlphaSmsService();
            $smsMessage = "Welcome to Hook & Hunt! Your account has been created. Login Phone: {$user->phone} Password: {$generatedPassword}. Please change your password after first login.";
            $smsService->sendSms($smsMessage, $user->phone);

            // 4. Create Staff Profile with Job Info
            StaffProfile::create([
                'user_id' => $user->id,
                'department_id' => $request->department_id,
                'designation' => $request->designation,
                'base_salary' => $request->base_salary,
                'house_rent' => $request->house_rent ?? 0,
                'medical_allowance' => $request->medical_allowance ?? 0,
                'conveyance_allowance' => $request->conveyance_allowance ?? 0,
                'overtime_hourly_rate' => $request->overtime_hourly_rate ?? 0,
                'joining_date' => $request->joining_date ?? now(),
                'address' => $request->address,
                'division' => $request->division,
                'district' => $request->district,
                'thana' => $request->thana,
                'dob' => $request->dob,
                'gender' => $request->gender,
                'office_email' => $request->office_email,
                'office_email_password' => $request->office_email_password, // Will be saved as provided
                'whatsapp_number' => $request->whatsapp_number,
                // Bank Account Information (for salary transfer)
                'bank_account_name' => $request->bank_account_name,
                'bank_account_number' => $request->bank_account_number,
                'bank_name' => $request->bank_name,
                'bank_branch' => $request->bank_branch,
            ]);

            DB::commit();
            return $this->sendSuccess($user->load('staffProfile.department'), 'Staff member onboarded successfully. Login credentials sent via SMS.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * Show Staff Details
     */
    public function show($id)
    {
        $staff = User::with([
            'staffProfile.department',
            'role.permissions:id,name,slug,group_name',
            'directPermissions' => function ($query) {
                $query->select('permissions.id', 'permissions.name', 'permissions.slug', 'permissions.group_name')
                      ->withPivot('is_blocked');
            }
        ])->findOrFail($id);

        // Permission check: Users can view their own profile OR need hrm.staff.view/hrm.staff.index permission
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->id != $id) {
            // Viewing someone else's profile - check permission
            if (!$currentUser->hasPermissionTo('hrm.staff.view') && !$currentUser->hasPermissionTo('hrm.staff.index')) {
                return $this->sendError('You do not have permission to view staff profiles.', null, 403);
            }
        }

        // ১. রোলের পারমিশন থেকে pivot হাইড করা
        if ($staff->role) {
            $staff->role->permissions->makeHidden('pivot');
        }

        // ২. Separate granted and blocked permissions BEFORE hiding pivot
        $grantedPermissions = $staff->directPermissions->filter(function ($perm) {
            return isset($perm->pivot) && $perm->pivot->is_blocked == 0;
        })->makeHidden(['pivot', 'id']);

        $blockedPermissions = $staff->directPermissions->filter(function ($perm) {
            return isset($perm->pivot) && $perm->pivot->is_blocked == 1;
        })->makeHidden(['pivot', 'id']);

        // ৩. Hide pivot from remaining directPermissions
        $staff->directPermissions->makeHidden('pivot');

        // Role permissions (for reference)
        $rolePermissions = $staff->role ? $staff->role->permissions : collect([]);

        return response()->json([
            'status' => true,
            'message' => 'User details retrieved.',
            'data' => [
                'user' => $staff,
                'role_permissions' => $rolePermissions,
                'grantedPermissions' => $grantedPermissions,
                'blockedPermissions' => $blockedPermissions,
            ],
            'errors' => null
        ], 200);
    }

    /**
     * Update Staff Info & Salary
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        // Permission check: Users can edit their own profile OR need hrm.staff.edit permission
        $currentUser = auth()->user();
        if ($currentUser && $currentUser->id != $id) {
            // Editing someone else's profile - check permission
            if (!$currentUser->hasPermissionTo('hrm.staff.edit')) {
                return $this->sendError('You do not have permission to edit staff profiles.', null, 403);
            }
        }

        $request->validate([
            'name' => 'required|string',
            'phone' => ['required', Rule::unique('users')->ignore($user->id)],
            'email' => 'nullable|email|unique:users,email,'.$user->id,
            'role_id' => 'exists:roles,id',
            'is_active' => 'nullable|boolean',

            // Staff Profile / HRM Fields
            'department_id' => 'nullable|exists:departments,id',
            'designation' => 'nullable|string',
            'base_salary' => 'nullable|numeric|min:0',
            'house_rent' => 'nullable|numeric|min:0',
            'medical_allowance' => 'nullable|numeric|min:0',
            'conveyance_allowance' => 'nullable|numeric|min:0',
            'overtime_hourly_rate' => 'nullable|numeric|min:0',
            'joining_date' => 'nullable|date',
            'address' => 'nullable|string',
            'division' => 'nullable|string',
            'district' => 'nullable|string',
            'thana' => 'nullable|string',
            'dob' => 'nullable|date',
            'gender' => 'nullable|in:male,female,other',
            'office_email' => 'nullable|email',
            'office_email_password' => 'nullable|string',
            'whatsapp_number' => 'nullable|string',

            // Bank Account Information (for salary transfer)
            'bank_account_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_branch' => 'nullable|string|max:255',

            // Password - optional
            'password' => 'nullable|string|min:6',
        ]);

        DB::beginTransaction();
        try {
            // Update Basic Info
            $userData = $request->only(['name', 'phone', 'email', 'role_id', 'is_active']);

            // Update password if provided
            if ($request->filled('password')) {
                $userData['password'] = Hash::make($request->password);
            }

            $user->update($userData);

            // Update Job Info
            $profileData = $request->only([
                'department_id',
                'designation',
                'base_salary',
                'house_rent',
                'medical_allowance',
                'conveyance_allowance',
                'overtime_hourly_rate',
                'joining_date',
                'address',
                'division',
                'district',
                'thana',
                'dob',
                'gender',
                'office_email',
                'office_email_password',
                'whatsapp_number',
                // Bank Account Information (for salary transfer)
                'bank_account_name',
                'bank_account_number',
                'bank_name',
                'bank_branch',
            ]);

            // updateOrCreate ব্যবহার করছি যাতে প্রোফাইল না থাকলে তৈরি হয়ে যায়
            StaffProfile::updateOrCreate(
                ['user_id' => $user->id],
                $profileData
            );

            DB::commit();
            return $this->sendSuccess($user->load('staffProfile'), 'Staff updated successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError($e->getMessage());
        }
    }

    /**
     * Change Staff Password
     */
    public function changePassword(Request $request, $id)
    {
        $user = User::findOrFail($id);
        $currentUser = auth()->user();

        // Permission check: User can change own password OR super_admin can change any password
        $isSuperAdmin = $currentUser->role && ($currentUser->role->slug === 'super_admin' || $currentUser->role_id == 1);
        if ($currentUser->id != $id && !$isSuperAdmin) {
            return $this->sendError('You do not have permission to change this password.', null, 403);
        }

        // Validation
        $request->validate([
            'password' => 'required|string|min:6|confirmed', // password_confirmation field must match
        ]);

        // If changing own password, verify current password
        if ($currentUser->id == $id) {
            $request->validate([
                'current_password' => 'required|string',
            ]);

            if (!Hash::check($request->current_password, $user->password)) {
                return $this->sendError('Current password is incorrect.', null, 422);
            }
        }

        // Update password
        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return $this->sendSuccess(null, 'Password changed successfully');
    }

    /**
     * Send New Password via SMS
     */
    public function sendPasswordSms($id)
    {
        $user = User::findOrFail($id);
        $currentUser = auth()->user();

        // Permission check: Only super_admin can send password SMS to other users
        $isSuperAdmin = $currentUser->role && ($currentUser->role->slug === 'super_admin' || $currentUser->role_id == 1);
        if (!$isSuperAdmin) {
            return $this->sendError('You do not have permission to send password SMS.', null, 403);
        }

        // Prevent sending to own account
        if ($currentUser->id == $id) {
            return $this->sendError('You cannot send password SMS to your own account.', null, 400);
        }

        DB::beginTransaction();
        try {
            // 1. Generate random 8-character alphanumeric password
            $newPassword = $this->generateRandomPassword();

            // 2. Update user password
            $user->update([
                'password' => Hash::make($newPassword),
            ]);

            // 3. Send SMS with new password
            $smsService = new AlphaSmsService();
            $smsMessage = "Your password has been reset. New Password: {$newPassword} Please login and change your password immediately for security.";
            $smsService->sendSms($smsMessage, $user->phone);

            DB::commit();
            return $this->sendSuccess([
                'phone' => $this->maskPhoneNumber($user->phone),
            ], 'New password has been sent via SMS successfully.');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to send password SMS: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Mask phone number for privacy (show first 4 and last 2 digits)
     */
    private function maskPhoneNumber($phone)
    {
        if (strlen($phone) < 6) {
            return $phone;
        }
        $start = substr($phone, 0, 4);
        $end = substr($phone, -2);
        $middle = str_repeat('x', strlen($phone) - 6);
        return $start . $middle . $end;
    }

    /**
     * Terminate / Remove Staff
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);

        // Prevent users from deleting themselves - NO ONE can delete themselves
        if ($user->id === auth()->id()) {
            return $this->sendError('You cannot delete your own account.', null, 400);
        }

        // Permission check: Need hrm.staff.delete permission
        if (!auth()->user()->hasPermissionTo('hrm.staff.delete')) {
            return $this->sendError('You do not have permission to delete staff.', null, 403);
        }

        // Soft Delete (History will remain)
        $user->delete();

        return $this->sendSuccess(null, 'Staff terminated successfully');
    }

    /**
     * HRM Dashboard Stats
     */
    public function getStats()
    {
        try {
            // Staff stats
            $totalStaff = User::whereHas('role', function($q) {
                $q->whereNotIn('id', [10, 11]); // Exclude customer roles
            })->count();

            $activeStaff = User::whereHas('role', function($q) {
                $q->whereNotIn('id', [10, 11]); // Exclude customer roles
            })->where('is_active', true)->count();

            // Get staff by department - check if tables exist
            $staffByDepartment = collect([]);
            if (Schema::hasTable('staff_profiles') && Schema::hasTable('departments')) {
                try {
                    $staffByDepartment = \DB::table('staff_profiles')
                        ->join('departments', 'staff_profiles.department_id', '=', 'departments.id')
                        ->select('departments.name', \DB::raw('COUNT(*) as count'))
                        ->groupBy('departments.id', 'departments.name')
                        ->get()
                        ->map(function ($item) {
                            return [
                                'name' => $item->name,
                                'count' => $item->count,
                            ];
                        });
                } catch (\Exception $e) {
                    \Log::warning('Could not fetch staff by department: ' . $e->getMessage());
                }
            }

            $thisMonthHires = User::whereHas('role', function($q) {
                $q->whereNotIn('id', [10, 11]); // Exclude customer roles
            })->whereMonth('created_at', now()->month)
              ->whereYear('created_at', now()->year)
              ->count();

            // Recent hires
            $recentHires = User::with(['staffProfile.department'])
                ->whereHas('role', function($q) {
                    $q->whereNotIn('id', [10, 11]); // Exclude customer roles
                })
                ->latest()
                ->limit(5)
                ->get()
                ->map(function ($user) {
                    $deptName = 'Not Assigned';
                    if ($user->staffProfile && $user->staffProfile->department) {
                        $deptName = $user->staffProfile->department->name;
                    }

                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'department' => $deptName,
                        'designation' => $user->staffProfile ? ($user->staffProfile->designation ?? 'N/A') : 'N/A',
                        'joiningDate' => $user->staffProfile && $user->staffProfile->joining_date
                            ? $user->staffProfile->joining_date->toIso8601String()
                            : $user->created_at->toIso8601String(),
                        'phone' => $user->phone,
                    ];
                });

            // Department stats
            $totalDepartments = 0;
            if (Schema::hasTable('departments')) {
                try {
                    $totalDepartments = \DB::table('departments')->count();
                } catch (\Exception $e) {
                    \Log::warning('Could not count departments: ' . $e->getMessage());
                }
            }

            // Attendance stats
            $todayPresent = 0;
            $todayAbsent = 0;
            $todayLate = 0;
            $attendanceRate = 0;

            if (Schema::hasTable('attendances')) {
                try {
                    $todayAttendance = \DB::table('attendances')
                        ->whereDate('date', today())
                        ->get();

                    $todayPresent = $todayAttendance->where('status', 'present')->count();
                    $todayAbsent = $todayAttendance->where('status', 'absent')->count();
                    $todayLate = $todayAttendance->where('status', 'late')->count();

                    $totalStaffRecorded = $todayAttendance->count();
                    $attendanceRate = $totalStaffRecorded > 0
                        ? round(($todayPresent / $totalStaffRecorded) * 100, 1)
                        : 0;
                } catch (\Exception $e) {
                    \Log::warning('Could not fetch attendance stats: ' . $e->getMessage());
                }
            }

            // Leave stats
            $pendingLeaves = 0;
            $approvedLeaves = 0;
            $rejectedLeaves = 0;
            $thisMonthLeaves = 0;
            $onLeaveCount = 0;

            if (Schema::hasTable('leaves')) {
                try {
                    $pendingLeaves = \DB::table('leaves')
                        ->where('status', 'pending')
                        ->count();

                    $approvedLeaves = \DB::table('leaves')
                        ->where('status', 'approved')
                        ->whereMonth('created_at', now()->month)
                        ->whereYear('created_at', now()->year)
                        ->count();

                    $rejectedLeaves = \DB::table('leaves')
                        ->where('status', 'rejected')
                        ->count();

                    $thisMonthLeaves = \DB::table('leaves')
                        ->whereMonth('start_date', now()->month)
                        ->whereYear('start_date', now()->year)
                        ->count();

                    // Count staff currently on leave
                    $onLeaveCount = \DB::table('leaves')
                        ->where('status', 'approved')
                        ->where('start_date', '<=', now())
                        ->where('end_date', '>=', now())
                        ->count();
                } catch (\Exception $e) {
                    \Log::warning('Could not fetch leave stats: ' . $e->getMessage());
                }
            }

            // Payroll stats
            $thisMonthPayroll = 0;
            $totalPaidPayroll = 0;

            if (Schema::hasTable('payrolls')) {
                try {
                    $thisMonthPayroll = \DB::table('payrolls')
                        ->whereMonth('created_at', now()->month)
                        ->whereYear('created_at', now()->year)
                        ->sum('net_salary');

                    $totalPaidPayroll = \DB::table('payrolls')
                        ->where('status', 'paid')
                        ->sum('net_salary');
                } catch (\Exception $e) {
                    \Log::warning('Could not fetch payroll stats: ' . $e->getMessage());
                }
            }

            // Upcoming leaves
            $upcomingLeaves = collect([]);
            if (Schema::hasTable('leaves') && Schema::hasTable('users')) {
                try {
                    $upcomingLeaves = \DB::table('leaves')
                        ->join('users', 'leaves.user_id', '=', 'users.id')
                        ->leftJoin('staff_profiles', 'users.id', '=', 'staff_profiles.user_id')
                        ->leftJoin('departments', 'staff_profiles.department_id', '=', 'departments.id')
                        ->where('leaves.status', 'approved')
                        ->where('leaves.start_date', '>=', now())
                        ->where('leaves.start_date', '<=', now()->addDays(30))
                        ->select('leaves.id', 'users.name as staff_name', 'departments.name as department', 'leaves.leave_type', 'leaves.start_date', 'leaves.end_date')
                        ->orderBy('leaves.start_date')
                        ->limit(5)
                        ->get()
                        ->map(function ($leave) {
                            $startDate = \Carbon\Carbon::parse($leave->start_date);
                            $endDate = \Carbon\Carbon::parse($leave->end_date);
                            $days = $startDate->diffInDays($endDate) + 1;

                            return [
                                'id' => $leave->id,
                                'staffName' => $leave->staff_name,
                                'department' => $leave->department ?? 'Not Assigned',
                                'leaveType' => ucfirst(str_replace('_', ' ', $leave->leave_type)),
                                'startDate' => $leave->start_date,
                                'endDate' => $leave->end_date,
                                'days' => $days,
                            ];
                        });
                } catch (\Exception $e) {
                    \Log::warning('Could not fetch upcoming leaves: ' . $e->getMessage());
                }
            }

            $stats = [
                'staff' => [
                    'total' => $totalStaff,
                    'active' => $activeStaff,
                    'onLeave' => $onLeaveCount,
                    'thisMonth' => $thisMonthHires,
                    'byDepartment' => $staffByDepartment,
                ],
                'departments' => [
                    'total' => $totalDepartments,
                ],
                'attendance' => [
                    'todayPresent' => $todayPresent,
                    'todayAbsent' => $todayAbsent,
                    'todayLate' => $todayLate,
                    'todayTotal' => $todayPresent + $todayAbsent + $todayLate,
                    'attendanceRate' => $attendanceRate,
                ],
                'leaves' => [
                    'pending' => $pendingLeaves,
                    'approved' => $approvedLeaves,
                    'rejected' => $rejectedLeaves,
                    'thisMonth' => $thisMonthLeaves,
                ],
                'payroll' => [
                    'thisMonth' => (float) $thisMonthPayroll,
                    'totalPaid' => (float) $totalPaidPayroll,
                ],
                'recentHires' => $recentHires,
                'upcomingLeaves' => $upcomingLeaves,
            ];

            return $this->sendSuccess($stats, 'HRM stats retrieved successfully');
        } catch (\Exception $e) {
            \Log::error('HRM Stats Error: ' . $e->getMessage() . ' Line: ' . $e->getLine());
            return $this->sendError('Failed to retrieve HRM stats: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * Generate random 8-character alphanumeric password
     */
    private function generateRandomPassword(): string
    {
        $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $password = '';

        for ($i = 0; $i < 8; $i++) {
            $password .= $characters[random_int(0, strlen($characters) - 1)];
        }

        return $password;
    }
}