<?php

namespace App\Http\Controllers\Api\V2\Hrm;

use App\Http\Controllers\Controller;
use App\Models\Leave;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class LeaveController extends Controller
{
    use ApiResponse;

    /**
     * 1. List Leaves (Admin sees all, Staff sees own)
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = Leave::with(['user:id,name', 'approver:id,name'])->latest();

        // Permission check: users can see their own leaves, managers need permission to see others
        if (!$user->hasPermissionTo('hrm.leave.index')) {
            // Non-admin users can only see their own leave requests
            $query->where('user_id', $user->id);
        }

        // Debug logging
        \Log::info('Leave Index - User Info:', [
            'user_id' => $user->id,
            'role_id' => $user->role_id,
            'role' => $user->role ? $user->role->toArray() : 'null',
            'request_params' => $request->all()
        ]);

        // Check if user is admin by checking role slug or role_id
        $isAdmin = false;

        if ($user->role) {
            // Check by role slug (preferred) - matches frontend
            $isAdmin = in_array($user->role->slug, ['super_admin', 'admin']);

            \Log::info('Role check:', [
                'role_slug' => $user->role->slug,
                'role_name' => $user->role->name,
                'is_admin_by_slug' => $isAdmin
            ]);
        }

        // Fallback to role_id check - Super Admin is ID 8, Admin is ID ???
        if (!$isAdmin) {
            $isAdmin = in_array($user->role_id, [8, 1, 2]);
            \Log::info('Role_id fallback check:', [
                'role_id' => $user->role_id,
                'is_admin_by_id' => $isAdmin
            ]);
        }

        \Log::info('Final Is Admin:', ['is_admin' => $isAdmin]);

        // Non-admins can only see their own leaves
        if (!$isAdmin) {
            $query->where('user_id', $user->id);
            \Log::info('Filtering by user_id (not admin):', ['user_id' => $user->id]);
        } else {
            \Log::info('User is admin - showing all leaves');
        }

        // Filter by status if provided
        if ($request->status) {
            $query->where('status', $request->status);
        }

        // Filter by user_id (admin only)
        if ($request->user_id && $isAdmin) {
            $query->where('user_id', $request->user_id);
            \Log::info('Admin filtering by specific user_id:', ['user_id' => $request->user_id]);
        }

        $leaves = $query->paginate(20);
        \Log::info('Leaves count:', ['count' => $leaves->total()]);

        return $this->sendSuccess($leaves);
    }

    /**
     * 2. Apply for Leave
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        $request->validate([
            'user_id' => 'nullable|integer|exists:users,id', // Admin can apply for others
            'type' => 'required|in:sick,casual,unpaid',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string'
        ]);

        // Determine target user ID - default to logged-in user
        $requestedUserId = $request->input('user_id') ? (int) $request->input('user_id') : (int) $user->id;

        // Permission check: users can create their own leave requests, managers need permission for others
        // Use loose comparison for type safety (string vs int)
        if ($requestedUserId != $user->id) {
            // Trying to create leave for someone else - requires permission
            if (!$user->hasPermissionTo('hrm.leave.create')) {
                return $this->sendError('You do not have permission to create leave requests for others.', null, 403);
            }
        }

        $userId = $requestedUserId;

        // Parse dates (supports both date and datetime formats)
        $start = Carbon::parse($request->start_date);
        $end = Carbon::parse($request->end_date);

        // Calculate days based on date difference (ignoring time)
        $days = $start->diffInDays($end) + 1;

        // Auto-approve if Admin creates it
        $isAdmin = in_array($user->role_id, [1, 2]) || in_array($user->role->slug ?? '', ['super_admin', 'admin']);
        $status = $isAdmin ? 'approved' : 'pending';
        $approvedBy = $isAdmin ? $user->id : null;

        $leave = Leave::create([
            'user_id' => $userId,
            'type' => $request->type,
            'start_date' => $start,
            'end_date' => $end,
            'days_count' => $days,
            'reason' => $request->reason,
            'status' => $status,
            'approved_by' => $approvedBy
        ]);

        return $this->sendSuccess($leave, "Leave request submitted ({$status})");
    }

    /**
     * 3. Approve / Reject (Admin Only) - Can also modify dates
     */
    public function update(Request $request, $id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.leave.approve')) {
            return $this->sendError('You do not have permission to approve leave requests.', null, 403);
        }

        $leave = Leave::findOrFail($id);

        // Validate
        $request->validate([
            'status' => 'required|in:approved,rejected',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
            'admin_note' => 'nullable|string'
        ]);

        // Update status and approver
        $leave->update([
            'status' => $request->status,
            'approved_by' => auth()->id()
        ]);

        // Update dates if provided (admin can modify leave duration)
        if ($request->has('start_date')) {
            $start = Carbon::parse($request->start_date);
            $leave->update(['start_date' => $start]);
        }

        if ($request->has('end_date')) {
            $end = Carbon::parse($request->end_date);
            $leave->update(['end_date' => $end]);
        }

        // Recalculate days if dates changed
        if ($request->has('start_date') || $request->has('end_date')) {
            $start = Carbon::parse($leave->start_date);
            $end = Carbon::parse($leave->end_date);
            $days = $start->diffInDays($end) + 1;
            $leave->update(['days_count' => $days]);
        }

        // Update reason if provided
        if ($request->has('reason')) {
            $leave->update(['reason' => $request->reason]);
        }

        // Store admin note in separate column
        if ($request->has('admin_note')) {
            $leave->update(['admin_note' => $request->admin_note]);
        }

        return $this->sendSuccess($leave->fresh(), "Leave request {$request->status}");
    }

    /**
     * 4. Cancel / Delete Request
     */
    public function destroy($id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.leave.delete')) {
            return $this->sendError('You do not have permission to delete leave requests.', null, 403);
        }

        $leave = Leave::findOrFail($id);
        
        if ($leave->status === 'approved' && !in_array(auth()->user()->role_id, [1, 2])) {
            return $this->sendError('Cannot delete approved leave. Contact Admin.');
        }

        $leave->delete();
        return $this->sendSuccess(null, 'Leave request deleted');
    }
}