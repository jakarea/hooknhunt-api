<?php

namespace App\Modules\Admin\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Modules\Admin\Http\Requests\StoreRoleRequest;
use App\Modules\Admin\Http\Requests\UpdateRoleRequest;
use App\Modules\System\Models\Role;
use App\Modules\System\Models\Permission;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

class RoleController extends Controller
{
    use ApiResponse;

    /**
     * Display listing of roles (Staff or Customer)
     *
     * @param Request $request
     * @return JsonResponse
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $type = $request->query('type');

            $query = Role::withCount('users')->orderBy('position');

            if ($type === 'staff') {
                $query->whereNotIn('id', [
                    config('roles.customer.retail_id'),
                    config('roles.customer.wholesale_id')
                ]);
            } elseif ($type === 'customer') {
                $query->whereIn('id', [
                    config('roles.customer.retail_id'),
                    config('roles.customer.wholesale_id')
                ]);
            }

            Log::info('Role list retrieved', [
                'type' => $type,
                'requested_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $query->get(),
                'Role list retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving role list', [
                'error' => $e->getMessage(),
                'user_id' => auth()->id()
            ]);
            return $this->sendError(
                'Failed to retrieve role list.',
                null,
                500
            );
        }
    }

    /**
     * Store a newly created role in storage.
     *
     * @param StoreRoleRequest $request
     * @return JsonResponse
     */
    public function store(StoreRoleRequest $request): JsonResponse
    {
        try {
            DB::beginTransaction();

            $validated = $request->validated();

            $role = Role::create([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']),
                'description' => $validated['description'] ?? null,
                'position' => $validated['position'] ?? 1,
            ]);

            // Sync permissions if provided
            if (isset($validated['permissions']) && is_array($validated['permissions'])) {
                $permissionIds = Permission::whereIn('slug', $validated['permissions'])->pluck('id');
                $role->permissions()->sync($permissionIds);
            }

            DB::commit();

            Log::info('Role created successfully', [
                'role_id' => $role->id,
                'role_name' => $role->name,
                'created_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $role->load('permissions'),
                'Role created successfully.',
                201
            );

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            if ($e->getCode() == 23000) {
                Log::warning('Duplicate role name', [
                    'name' => $request->name,
                    'error' => $e->getMessage()
                ]);
                return $this->sendError(
                    'A role with this name already exists.',
                    null,
                    409
                );
            }
            Log::error('Database error while creating role', [
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to create role due to database error.',
                config('app.debug') ? ['error' => $e->getMessage()] : null,
                500
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Unexpected error while creating role', [
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to create role. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Display the specified role.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function show(int $id): JsonResponse
    {
        try {
            $role = Role::withSuperAdmin()
                ->with(['permissions', 'users'])
                ->find($id);

            if (!$role) {
                return $this->sendError('Role not found.', null, 404);
            }

            Log::info('Role details retrieved', [
                'role_id' => $role->id,
                'requested_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $role,
                'Role retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving role details', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve role details.',
                null,
                500
            );
        }
    }

    /**
     * Update the specified role in storage.
     *
     * @param UpdateRoleRequest $request
     * @param int $id
     * @return JsonResponse
     */
    public function update(UpdateRoleRequest $request, int $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $role = Role::withSuperAdmin()->find($id);

            if (!$role) {
                return $this->sendError('Role not found.', null, 404);
            }

            // Prevent modifying protected system roles
            $protectedRoleIds = [
                config('roles.staff.super_admin_id'),
                config('roles.supplier.supplier_id'),
                config('roles.customer.retail_id'),
                config('roles.customer.wholesale_id')
            ];

            if (in_array($role->id, $protectedRoleIds)) {
                return $this->sendError(
                    'This system role cannot be modified.',
                    null,
                    403
                );
            }

            $validated = $request->validated();

            $role->update([
                'name' => $validated['name'],
                'slug' => Str::slug($validated['name']),
                'description' => $validated['description'] ?? null,
                'position' => $validated['position'] ?? $role->position,
            ]);

            // Sync permissions if provided
            if (isset($validated['permissions']) && is_array($validated['permissions'])) {
                $permissionIds = Permission::whereIn('slug', $validated['permissions'])->pluck('id');
                $role->permissions()->sync($permissionIds);
            }

            DB::commit();

            Log::info('Role updated successfully', [
                'role_id' => $role->id,
                'role_name' => $role->name,
                'updated_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $role->load('permissions'),
                'Role updated successfully.'
            );

        } catch (\Illuminate\Database\QueryException $e) {
            DB::rollBack();
            if ($e->getCode() == 23000) {
                Log::warning('Duplicate role name during update', [
                    'role_id' => $id,
                    'error' => $e->getMessage()
                ]);
                return $this->sendError(
                    'A role with this name already exists.',
                    null,
                    409
                );
            }
            Log::error('Database error while updating role', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to update role.',
                null,
                500
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Unexpected error while updating role', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to update role. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Remove the specified role from storage (soft delete).
     *
     * @param int $id
     * @return JsonResponse
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            DB::beginTransaction();

            $role = Role::withSuperAdmin()->find($id);

            if (!$role) {
                return $this->sendError('Role not found.', null, 404);
            }

            // Prevent deleting protected system roles
            $protectedRoleIds = [
                config('roles.staff.super_admin_id'),
                config('roles.supplier.supplier_id'),
                config('roles.customer.retail_id'),
                config('roles.customer.wholesale_id')
            ];

            if (in_array($role->id, $protectedRoleIds)) {
                return $this->sendError(
                    'This system role cannot be deleted.',
                    null,
                    403
                );
            }

            // Reassign users to default customer role
            $defaultRoleId = config('roles.customer.retail_id');
            $userCount = User::where('role_id', $role->id)->count();

            if ($userCount > 0) {
                User::where('role_id', $role->id)->update(['role_id' => $defaultRoleId]);
            }

            $roleName = $role->name;
            $role->delete();

            DB::commit();

            Log::info('Role deleted successfully', [
                'role_id' => $id,
                'role_name' => $roleName,
                'users_reassigned' => $userCount,
                'deleted_by' => auth()->id()
            ]);

            $message = $userCount > 0
                ? "Role deleted successfully. {$userCount} user(s) reassigned to Retail Customer."
                : 'Role deleted successfully.';

            return $this->sendSuccess(null, $message);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting role', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to delete role. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Get all permissions grouped by module.
     *
     * @return JsonResponse
     */
    public function indexPermissions(): JsonResponse
    {
        try {
            $permissions = Permission::all()->groupBy('module_name');

            Log::info('Permissions list retrieved', [
                'requested_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $permissions,
                'Permissions grouped by module retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving permissions', [
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve permissions.',
                null,
                500
            );
        }
    }

    /**
     * Get permissions for a specific role.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getPermissions(int $id): JsonResponse
    {
        try {
            $role = Role::with('permissions')->find($id);

            if (!$role) {
                return $this->sendError('Role not found.', null, 404);
            }

            return $this->sendSuccess(
                $role->permissions,
                'Role permissions retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving role permissions', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve role permissions.',
                null,
                500
            );
        }
    }

    /**
     * Assign permissions to a role.
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
                'permissions.*' => 'exists:permissions,slug'
            ]);

            $role = Role::find($id);

            if (!$role) {
                return $this->sendError('Role not found.', null, 404);
            }

            // Prevent modifying protected system roles
            $protectedRoleIds = [
                config('roles.staff.super_admin_id'),
                config('roles.supplier.supplier_id'),
                config('roles.customer.retail_id'),
                config('roles.customer.wholesale_id')
            ];

            if (in_array($role->id, $protectedRoleIds)) {
                return $this->sendError(
                    'Cannot modify permissions for this system role.',
                    null,
                    403
                );
            }

            // Convert permission slugs to IDs and sync
            $permissionIds = Permission::whereIn('slug', $validated['permissions'])->pluck('id');
            $role->permissions()->sync($permissionIds);

            Log::info('Role permissions updated', [
                'role_id' => $role->id,
                'permissions_count' => count($permissionIds),
                'updated_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $role->load('permissions'),
                'Role permissions updated successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error assigning permissions to role', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to assign permissions. Please try again.',
                null,
                500
            );
        }
    }

    /**
     * Get users for a specific role.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function getUsers(int $id): JsonResponse
    {
        try {
            $role = Role::find($id);

            if (!$role) {
                return $this->sendError('Role not found.', null, 404);
            }

            $users = $role->users()->with('profile', 'customerProfile')->paginate(20);

            return $this->sendSuccess(
                $users,
                'Role users retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving role users', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve role users.',
                null,
                500
            );
        }
    }

    /**
     * Get soft deleted (archived) roles.
     *
     * @return JsonResponse
     */
    public function trashed(): JsonResponse
    {
        try {
            $trashedRoles = Role::withSuperAdmin()
                ->onlyTrashed()
                ->withCount('users')
                ->orderBy('deleted_at', 'desc')
                ->get();

            Log::info('Archived roles retrieved', [
                'requested_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $trashedRoles,
                'Archived roles retrieved successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error retrieving archived roles', [
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to retrieve archived roles.',
                null,
                500
            );
        }
    }

    /**
     * Restore a soft deleted role.
     *
     * @param int $id
     * @return JsonResponse
     */
    public function restore(int $id): JsonResponse
    {
        try {
            $role = Role::withSuperAdmin()->onlyTrashed()->find($id);

            if (!$role) {
                return $this->sendError('Archived role not found.', null, 404);
            }

            // Prevent restoring protected system roles
            $protectedRoleIds = [
                config('roles.staff.super_admin_id'),
                config('roles.supplier.supplier_id'),
                config('roles.customer.retail_id'),
                config('roles.customer.wholesale_id')
            ];

            if (in_array($role->id, $protectedRoleIds)) {
                return $this->sendError(
                    'This system role cannot be restored.',
                    null,
                    403
                );
            }

            $role->restore();

            Log::info('Role restored successfully', [
                'role_id' => $role->id,
                'role_name' => $role->name,
                'restored_by' => auth()->id()
            ]);

            return $this->sendSuccess(
                $role,
                'Role restored successfully.'
            );

        } catch (\Exception $e) {
            Log::error('Error restoring role', [
                'role_id' => $id,
                'error' => $e->getMessage()
            ]);
            return $this->sendError(
                'Failed to restore role. Please try again.',
                null,
                500
            );
        }
    }
}
