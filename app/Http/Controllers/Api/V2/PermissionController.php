<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;

class PermissionController extends Controller
{

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|unique:permissions,name',
                'slug' => 'required|string|unique:permissions,slug',
                'group_name' => 'required|string'
            ]);

            $permission = Permission::create($validated);

            return response()->json([
                'status' => true,
                'message' => 'Permission created successfully.',
                'data' => $permission
            ], 201);
            
        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'পারমিশন তৈরি করা সম্ভব হয়নি।',
                'errors' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * সব পারমিশনের লিস্ট (Dropdown বা ACL এর জন্য)
     */
    public function list()
    {
        try {
            $permissions = Permission::select('id', 'name', 'slug', 'key', 'group_name', 'module_name')
                ->orderBy('group_name')
                ->orderBy('module_name')
                ->get();

            return response()->json([
                'status' => true,
                'message' => 'Permission list retrieved.',
                'data' => $permissions,
                'errors' => null
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'পারমিশন লিস্ট পাওয়া যায়নি।',
                'errors' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }

    /**
     * Get permissions grouped by group and module
     * Used for frontend permission selection UI
     */
    public function grouped()
    {
        try {
            $permissions = Permission::select('id', 'name', 'slug', 'key', 'group_name', 'module_name')
                ->orderBy('group_name')
                ->orderBy('module_name')
                ->orderBy('name')
                ->get();

            // Group by group_name and then by module_name
            $grouped = [];
            foreach ($permissions as $permission) {
                if (!isset($grouped[$permission->group_name])) {
                    $grouped[$permission->group_name] = [];
                }
                if (!isset($grouped[$permission->group_name][$permission->module_name])) {
                    $grouped[$permission->group_name][$permission->module_name] = [];
                }
                $grouped[$permission->group_name][$permission->module_name][] = $permission;
            }

            return response()->json([
                'status' => true,
                'message' => 'Permissions grouped by module.',
                'data' => $grouped,
                'errors' => null
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => false,
                'message' => 'পারমিশন লিস্ট পাওয়া যায়নি।',
                'errors' => $e->getMessage(),
                'data' => null
            ], 500);
        }
    }
}