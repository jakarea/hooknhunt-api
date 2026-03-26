<?php

namespace App\Http\Controllers\Api\V2\Hrm;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DepartmentController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of departments
     */
    public function index(Request $request)
    {
        $query = Department::query();

        // Non-admin users can only see active departments (for dropdowns, profile display, etc.)
        if (!auth()->user()->hasPermissionTo('hrm.department.index')) {
            $query->where('is_active', true);
        } else {
            // Admins can filter by active status if requested
            if ($request->has('is_active')) {
                $query->where('is_active', $request->boolean('is_active'));
            }
            // Default to active departments only if no filter specified
            if (!$request->has('is_active')) {
                $query->where('is_active', true);
            }
        }

        // With employee count
        $departments = $query->withCount('employees')->get();

        return $this->sendSuccess($departments, 'Departments retrieved successfully.');
    }

    /**
     * Store a newly created department
     */
    public function store(Request $request): JsonResponse
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.department.create')) {
            return $this->sendError('You do not have permission to create departments.', null, 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
            'is_active' => 'sometimes|boolean',
        ]);

        $department = Department::create([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? true,
        ]);

        return $this->sendSuccess($department->loadCount('employees'), 'Department created successfully.', 201);
    }

    /**
     * Display the specified department
     */
    public function show($id): JsonResponse
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.department.view')) {
            return $this->sendError('You do not have permission to view department details.', null, 403);
        }

        $department = Department::withCount('employees')->findOrFail($id);

        return $this->sendSuccess($department, 'Department retrieved successfully.');
    }

    /**
     * Update the specified department
     */
    public function update(Request $request, $id): JsonResponse
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.department.edit')) {
            return $this->sendError('You do not have permission to edit departments.', null, 403);
        }

        $department = Department::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name,' . $id,
            'is_active' => 'sometimes|boolean',
        ]);

        $department->update([
            'name' => $validated['name'],
            'is_active' => $validated['is_active'] ?? $department->is_active,
        ]);

        return $this->sendSuccess($department->loadCount('employees'), 'Department updated successfully.');
    }

    /**
     * Remove the specified department
     */
    public function destroy($id): JsonResponse
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.department.delete')) {
            return $this->sendError('You do not have permission to delete departments.', null, 403);
        }

        $department = Department::findOrFail($id);

        // Check if department has employees
        if ($department->employees()->count() > 0) {
            return $this->sendError(
                'Cannot delete department with employees. Please reassign or remove employees first.',
                null,
                422
            );
        }

        $department->delete();

        return $this->sendSuccess(null, 'Department deleted successfully.');
    }
}