<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    use ApiResponse;

    /**
     * স্টাফ অথবা কাস্টমার রোল আলাদাভাবে ড্রপডাউন বা লিস্টে দেখানো
     */
    public function index(Request $request)
    {
        $type = $request->query('type'); // 'staff' or 'customer'

        $query = Role::withCount('users')->orderBy('position');

        if ($type === 'staff') {
            // Exclude customer roles (10 = Retail Customer, 11 = Wholesale Customer)
            $query->whereNotIn('id', [10, 11]);
        } elseif ($type === 'customer') {
            // Include only customer roles
            $query->whereIn('id', [10, 11]);
        }

        return $this->sendSuccess($query->get(), 'Role list retrieved.');
    }

    /**
     * ডাইনামিক রোল তৈরি
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|unique:roles,name',
            'description' => 'nullable|string',
            'position' => 'nullable|integer|min:1',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,slug'
        ]);

        $role = Role::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name),
            'description' => $request->description,
            'position' => $request->position ?? 1,
        ]);

        // রোল তৈরির সময় সরাসরি পারমিশন সিঙ্ক করা (ডাইনামিক)
        if ($request->has('permissions')) {
            // Convert permission slugs to IDs
            $permissionIds = Permission::whereIn('slug', $request->permissions)->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        return $this->sendSuccess($role->load('permissions'), 'Role created successfully.', 201);
    }

    /**
     * সব পারমিশনের লিস্ট (মডিউল অনুযায়ী গ্রুপ করা)
     * এটি অ্যাডমিন প্যানেলে চেকবক্স সাজাতে সাহায্য করবে
     */
    public function getAllPermissions()
    {
        $permissions = Permission::all()->groupBy('module_name');
        return $this->sendSuccess($permissions, 'Permissions grouped by module.');
    }

    /**
     * Show specific role with permissions
     */
    public function show($id)
    {
        $role = Role::withSuperAdmin()->with(['permissions:id,name,slug,group_name', 'users'])->findOrFail($id);
        return $this->sendSuccess($role, 'Role retrieved successfully.');
    }

    /**
     * Update role
     */
    public function update(Request $request, $id)
    {
        $role = Role::withSuperAdmin()->findOrFail($id);

        // Prevent modifying critical system roles (by ID for security)
        $protectedRoleIds = [1, 9, 10, 11]; // Super Admin, Supplier, Retail Customer, Wholesale Customer
        $protectedRoleNames = [
            1 => 'Super Admin',
            9 => 'Supplier',
            10 => 'Retail Customer',
            11 => 'Wholesale Customer'
        ];

        if (in_array($role->id, $protectedRoleIds)) {
            $roleName = $protectedRoleNames[$role->id] ?? 'This system role';
            return $this->sendError("{$roleName} role cannot be modified. It is a critical system role.", null, 403);
        }

        $request->validate([
            'name' => 'required|unique:roles,name,' . $id,
            'description' => 'nullable|string',
            'position' => 'nullable|integer|min:1',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,slug'
        ]);

        $role->update([
            'name' => $request->name,
            'description' => $request->description,
            'position' => $request->position ?? 1,
        ]);

        // Sync permissions if provided
        if ($request->has('permissions')) {
            // Convert permission slugs to IDs
            $permissionIds = Permission::whereIn('slug', $request->permissions)->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        return $this->sendSuccess($role->load('permissions'), 'Role updated successfully.');
    }

    /**
     * Soft delete role
     * Users are automatically reassigned to Retail Customer (default role)
     */
    public function destroy($id)
    {
        $role = Role::withSuperAdmin()->findOrFail($id);

        // Prevent deleting critical system roles (by ID for security)
        $protectedRoleIds = [1, 9, 10, 11]; // Super Admin, Supplier, Retail Customer, Wholesale Customer
        $protectedRoleNames = [
            1 => 'Super Admin',
            9 => 'Supplier',
            10 => 'Retail Customer',
            11 => 'Wholesale Customer'
        ];

        if (in_array($role->id, $protectedRoleIds)) {
            $roleName = $protectedRoleNames[$role->id] ?? 'This system role';
            return $this->sendError("{$roleName} role cannot be archived. It is a critical system role.", null, 403);
        }

        // Reassign all active users to Retail Customer (default role)
        $userCount = \App\Models\User::where('role_id', $role->id)->count();
        if ($userCount > 0) {
            \App\Models\User::where('role_id', $role->id)->update(['role_id' => 10]); // 10 = Retail Customer
        }

        $role->delete();

        $message = $userCount > 0
            ? "Role archived successfully. {$userCount} user(s) reassigned to Retail Customer."
            : 'Role archived successfully.';

        return $this->sendSuccess(null, $message);
    }

    /**
     * Get all deleted roles (archived)
     */
    public function trashed()
    {
        $trashedRoles = Role::withSuperAdmin()->onlyTrashed()->withCount('users')->orderBy('deleted_at', 'desc')->get();
        return $this->sendSuccess($trashedRoles, 'Archived roles retrieved successfully.');
    }

    /**
     * Restore a soft deleted role
     */
    public function restore($id)
    {
        $role = Role::withSuperAdmin()->onlyTrashed()->findOrFail($id);

        // Prevent restoring critical system roles (by ID for security)
        $protectedRoleIds = [1, 9, 10, 11]; // Super Admin, Supplier, Retail Customer, Wholesale Customer
        $protectedRoleNames = [
            1 => 'Super Admin',
            9 => 'Supplier',
            10 => 'Retail Customer',
            11 => 'Wholesale Customer'
        ];

        if (in_array($role->id, $protectedRoleIds)) {
            $roleName = $protectedRoleNames[$role->id] ?? 'This system role';
            return $this->sendError("{$roleName} role cannot be restored. It is a critical system role.", null, 403);
        }

        $role->restore();
        return $this->sendSuccess($role, 'Role restored successfully.');
    }

    /**
     * Permanently delete a role (force delete)
     * Users (including soft-deleted) are reassigned to Retail Customer first
     */
    public function forceDelete($id)
    {
        $role = Role::withSuperAdmin()->onlyTrashed()->findOrFail($id);

        // Prevent force deleting critical system roles (by ID for security)
        $protectedRoleIds = [1, 9, 10, 11]; // Super Admin, Supplier, Retail Customer, Wholesale Customer
        $protectedRoleNames = [
            1 => 'Super Admin',
            9 => 'Supplier',
            10 => 'Retail Customer',
            11 => 'Wholesale Customer'
        ];

        if (in_array($role->id, $protectedRoleIds)) {
            $roleName = $protectedRoleNames[$role->id] ?? 'This system role';
            return $this->sendError("{$roleName} role cannot be permanently deleted. It is a critical system role.", null, 403);
        }

        // Reassign all users (including soft-deleted) to Retail Customer before force delete
        $userCount = \App\Models\User::withTrashed()->where('role_id', $role->id)->count();
        if ($userCount > 0) {
            \App\Models\User::withTrashed()->where('role_id', $role->id)->update(['role_id' => 10]); // 10 = Retail Customer
        }

        $role->forceDelete();

        $message = $userCount > 0
            ? "Role permanently deleted. {$userCount} user(s) reassigned to Retail Customer."
            : 'Role permanently deleted successfully.';

        return $this->sendSuccess(null, $message);
    }

    /**
     * ডাইনামিক পারমিশন সিঙ্কিং
     * Accepts permission slugs from frontend and converts to IDs
     */
    public function syncPermissions(Request $request, $id)
    {
        $role = Role::withSuperAdmin()->findOrFail($id);

        // Prevent modifying permissions for critical system roles
        $protectedRoleIds = [1, 9, 10, 11]; // Super Admin, Supplier, Retail Customer, Wholesale Customer
        $protectedRoleNames = [
            1 => 'Super Admin',
            9 => 'Supplier',
            10 => 'Retail Customer',
            11 => 'Wholesale Customer'
        ];

        if (in_array($role->id, $protectedRoleIds)) {
            $roleName = $protectedRoleNames[$role->id] ?? 'This system role';
            return $this->sendError("{$roleName} role permissions cannot be modified. It is a critical system role.", null, 403);
        }

        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,slug'
        ]);

        // Convert permission slugs to IDs
        $permissionIds = Permission::whereIn('slug', $request->permissions)->pluck('id');

        // Sync using permission IDs
        $role->permissions()->sync($permissionIds);

        return $this->sendSuccess($role->load('permissions'), 'Permissions synced successfully.');
    }

    public function getPermissions($id)
    {
        try {
            // ১. রোলটি খুঁজে বের করা এবং তার সাথে পারমিশনগুলো লোড করা
            $role = \App\Models\Role::withSuperAdmin()->with('permissions:id,name,slug,group_name')->findOrFail($id);

            return response()->json([
                'status' => true,
                'message' => "Permissions for role: {$role->name}",
                'data' => [
                    'role_id' => $role->id,
                    'role_name' => $role->name,
                    'permissions' => $role->permissions
                ],
                'errors' => null
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'রোলের পারমিশন পাওয়া যায়নি।',
                'errors' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

}