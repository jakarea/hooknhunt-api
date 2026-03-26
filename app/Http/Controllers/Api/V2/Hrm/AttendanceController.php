<?php

namespace App\Http\Controllers\Api\V2\Hrm;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Setting;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    use ApiResponse;

    /**
     * Get work end time from settings for auto-completion
     * Falls back to 12:00:00 if setting not found
     */
    private function getStandardClockOutTime(): string
    {
        $setting = Setting::where('key', 'work_end_time')
            ->where('group', 'hrm')
            ->first();

        if ($setting && $setting->value) {
            // Convert HH:MM format to HH:MM:SS
            $time = $setting->value;
            if (strlen($time) === 5) { // HH:MM format
                return $time . ':00';
            }
            return $time;
        }

        // Fallback to default
        return '12:00:00';
    }

    /**
     * 1. Clock In (Staff or Admin for Staff)
     * Sequence: Must be first action of the day
     */
    public function clockIn(Request $request)
    {
        // Permission check - staff can clock in for themselves
        $user = auth()->user();
        if ($request->has('user_id') && $request->user_id != $user->id) {
            // Admin trying to clock in for someone else
            if (!$user->hasPermissionTo('hrm.attendance.manage')) {
                return $this->sendError('You do not have permission to manage attendance.', null, 403);
            }
        }

        $userId = $request->user_id ?? auth()->id();
        $date = date('Y-m-d');
        $time = date('H:i:s');

        // Check for incomplete attendance from previous day
        $wasFixed = $this->checkAndFixIncompleteAttendance($userId, $date);

        // Check already clocked in today?
        $exists = Attendance::where('user_id', $userId)->where('date', $date)->first();

        if ($exists) {
            // Check if today's attendance is incomplete (clocked in but not clocked out)
            if ($exists->clock_in && !$exists->clock_out) {
                // Auto-complete today's incomplete attendance
                $standardClockOut = $this->getStandardClockOutTime();
                $updateData = ['clock_out' => $standardClockOut];

                // If on break, also close the break
                if ($exists->isOnBreak()) {
                    $breakOut = $exists->break_out ?? [];
                    $breakOut[] = $standardClockOut;
                    $updateData['break_out'] = $breakOut;
                }

                $displayTime = substr($standardClockOut, 0, 5);
                $updateData['note'] = ($exists->note ?? '') . " [Auto-completed at {$displayTime} due to incomplete attendance]";
                $exists->update($updateData);
                $wasFixed = true;
            } else {
                // Already completed today, don't allow clock in again
                $status = $exists->status ?? 'completed';
                $clockIn = $exists->clock_in ?? '--:--';
                $clockOut = $exists->clock_out ?? '--:--';
                return $this->sendError("You have already completed attendance for today (Clock In: {$clockIn}, Clock Out: {$clockOut}, Status: {$status}).");
            }
        }

        // Late Calculation Logic (Office starts at 10:00 AM with 15 mins grace)
        $status = 'present';
        $officeStartTime = '10:15:00';
        if ($time > $officeStartTime) {
            $status = 'late';
        }

        $attendance = Attendance::create([
            'user_id' => $userId,
            'date' => $date,
            'clock_in' => $time,
            'break_in' => [], // Initialize as empty array
            'break_out' => [], // Initialize as empty array
            'status' => $status,
            'note' => $request->note,
            'updated_by' => auth()->id()
        ]);

        $message = "Clock In Successful ({$status})";
        if ($wasFixed) {
            $standardTime = substr($this->getStandardClockOutTime(), 0, 5);
            $message .= ". Your previous day's attendance was auto-completed at {$standardTime}.";
        }

        return $this->sendSuccess($attendance, $message);
    }

    /**
     * 2. Clock Out
     * Sequence: Must be clocked in and NOT on break
     */
    public function clockOut(Request $request)
    {
        $userId = $request->user_id ?? auth()->id();
        $date = date('Y-m-d');
        $time = date('H:i:s');

        $attendance = Attendance::where('user_id', $userId)->where('date', $date)->first();

        if (!$attendance) {
            return $this->sendError('You have not clocked in yet.');
        }

        if ($attendance->clock_out) {
            return $this->sendError('Already clocked out for today.');
        }

        // VALIDATE SEQUENCE: Cannot clock out while on break
        if ($attendance->isOnBreak()) {
            return $this->sendError('You are currently on break. Please end your break first.');
        }

        $attendance->update([
            'clock_out' => $time
        ]);

        return $this->sendSuccess($attendance, 'Clock Out Successful');
    }

    /**
     * 3. Break In
     * Sequence: Must be clocked in, NOT on break, NOT clocked out
     */
    public function breakIn(Request $request)
    {
        $request->validate([
            'note' => 'required|string|max:500',
            'break_time' => 'nullable|date_format:H:i:s'
        ]);

        $userId = $request->user_id ?? auth()->id();
        $date = date('Y-m-d');
        // Use the provided break_time from client, or fallback to current server time
        $time = $request->break_time ?? date('H:i:s');

        $attendance = Attendance::where('user_id', $userId)->where('date', $date)->first();

        if (!$attendance) {
            return $this->sendError('You must clock in before taking a break.');
        }

        if ($attendance->clock_out) {
            return $this->sendError('Cannot take break after clocking out.');
        }

        // VALIDATE SEQUENCE: Cannot start break if already on break
        if ($attendance->isOnBreak()) {
            return $this->sendError('You are already on break.');
        }

        // Add break time to array
        $breakIn = $attendance->break_in ?? [];
        $breakIn[] = $time;

        // Add break note to array
        $breakNotes = $attendance->break_notes ?? [];
        $breakNotes[] = $request->note;

        $attendance->update([
            'break_in' => $breakIn,
            'break_notes' => $breakNotes,
        ]);

        return $this->sendSuccess($attendance->fresh(), 'Break started successfully');
    }

    /**
     * 4. Break Out (End Break)
     * Sequence: Must be on break
     */
    public function breakOut(Request $request)
    {
        $userId = $request->user_id ?? auth()->id();
        $date = date('Y-m-d');
        $time = date('H:i:s');

        $attendance = Attendance::where('user_id', $userId)->where('date', $date)->first();

        if (!$attendance) {
            return $this->sendError('No attendance record found.');
        }

        if ($attendance->clock_out) {
            return $this->sendError('Cannot end break after clocking out.');
        }

        // VALIDATE SEQUENCE: Must be on break to end break
        if (!$attendance->isOnBreak()) {
            return $this->sendError('You are not currently on break.');
        }

        // Add break out time to array
        $breakOut = $attendance->break_out ?? [];
        $breakOut[] = $time;

        $attendance->update([
            'break_out' => $breakOut
        ]);

        return $this->sendSuccess($attendance->fresh(), 'Break ended successfully');
    }

    /**
     * Get my current attendance status
     * Debug endpoint to check current attendance state
     */
    public function myStatus(Request $request)
    {
        $userId = auth()->id();
        $today = date('Y-m-d');
        $currentTime = date('H:i:s');

        // Get today's attendance
        $todayAttendance = Attendance::where('user_id', $userId)
            ->where('date', $today)
            ->first();

        // Get last attendance (could be today or previous)
        $lastAttendance = Attendance::where('user_id', $userId)
            ->latest('date')
            ->first();

        $standardClockOut = $this->getStandardClockOutTime();

        return response()->json([
            'current_time' => $currentTime,
            'today' => $today,
            'today_attendance' => $todayAttendance ? [
                'id' => $todayAttendance->id,
                'date' => $todayAttendance->date,
                'clock_in' => $todayAttendance->clock_in,
                'clock_out' => $todayAttendance->clock_out,
                'break_in_count' => is_array($todayAttendance->break_in) ? count($todayAttendance->break_in) : 0,
                'break_out_count' => is_array($todayAttendance->break_out) ? count($todayAttendance->break_out) : 0,
                'is_on_break' => $todayAttendance->isOnBreak(),
                'status' => $todayAttendance->getCurrentStatus(),
                'issues' => $todayAttendance->getIncompleteState(),
            ] : null,
            'last_attendance' => $lastAttendance ? [
                'id' => $lastAttendance->id,
                'date' => $lastAttendance->date,
                'clock_in' => $lastAttendance->clock_in,
                'clock_out' => $lastAttendance->clock_out,
                'is_on_break' => $lastAttendance->isOnBreak(),
                'issues' => $lastAttendance->getIncompleteState(),
            ] : null,
            'standard_clock_out_time' => $standardClockOut,
            'can_clock_in' => !$todayAttendance || ($todayAttendance->clock_in && !$todayAttendance->clock_out),
            'can_clock_out' => $todayAttendance && $todayAttendance->clock_in && !$todayAttendance->clock_out && !$todayAttendance->isOnBreak(),
        ]);
    }

    /**
     * 5. Monthly Attendance Report (Admin View)
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $startDate = $request->start_date ?? date('Y-m-01');
        $endDate = $request->end_date ?? date('Y-m-t');

        $query = Attendance::with(['user:id,name'])
            ->whereBetween('date', [$startDate, $endDate])
            ->latest('date');

        // Permission check: users can see their own attendance, managers need permission to see others
        if (!$user->hasPermissionTo('hrm.attendance.view')) {
            // Non-admin users can only see their own attendance
            $query->where('user_id', $user->id);
        }

        // Filter by specific employee (only for those with permission)
        if ($request->user_id) {
            if (!$user->hasPermissionTo('hrm.attendance.view')) {
                // Non-admin trying to view someone else's attendance
                if ($request->user_id != $user->id) {
                    return $this->sendError('You do not have permission to view other attendance records.', null, 403);
                }
            }
            $query->where('user_id', $request->user_id);
        }

        return $this->sendSuccess($query->paginate(30));
    }

    /**
     * 6. Manual Entry / Update (Admin Power)
     */
    public function store(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('hrm.attendance.edit')) {
            return $this->sendError('You do not have permission to edit attendance records.', null, 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'date' => 'required|date',
            'status' => 'required|in:present,late,absent,leave,holiday',
            'clock_in' => 'nullable',
            'clock_out' => 'nullable',
            'break_in' => 'nullable|array',
            'break_out' => 'nullable|array'
        ]);

        $attendance = Attendance::updateOrCreate(
            [
                'user_id' => $request->user_id,
                'date' => $request->date
            ],
            [
                'clock_in' => $request->clock_in,
                'clock_out' => $request->clock_out,
                'break_in' => $request->break_in ?? [],
                'break_out' => $request->break_out ?? [],
                'status' => $request->status,
                'note' => $request->note,
                'updated_by' => auth()->id()
            ]
        );

        return $this->sendSuccess($attendance, 'Attendance updated manually');
    }

    /**
     * Check and fix incomplete attendance from previous day
     * This is called automatically on clock in for a new day
     * @return bool True if attendance was fixed, false otherwise
     */
    private function checkAndFixIncompleteAttendance(int $userId, string $currentDate): bool
    {
        // Find the most recent attendance record
        $lastAttendance = Attendance::where('user_id', $userId)
            ->where('date', '<', $currentDate)
            ->latest('date')
            ->first();

        if (!$lastAttendance) {
            return false;
        }

        $issues = $lastAttendance->getIncompleteState();
        if (empty($issues)) {
            return false; // No issues found
        }

        // Get standard clock out time from settings
        $standardClockOut = $this->getStandardClockOutTime();

        // Fix incomplete states with standard times
        $updateData = [];

        if (in_array('clocked_in_without_out', $issues)) {
            $updateData['clock_out'] = $standardClockOut;
        }

        if (in_array('on_break_without_out', $issues)) {
            $breakOut = $lastAttendance->break_out ?? [];
            $breakOut[] = $standardClockOut;
            $updateData['break_out'] = $breakOut;

            // If clocked in without out, also set clock out
            if (in_array('clocked_in_without_out', $issues)) {
                $updateData['clock_out'] = $standardClockOut;
            }
        }

        if (!empty($updateData)) {
            // Format time for display in note (remove seconds if present)
            $displayTime = substr($standardClockOut, 0, 5); // HH:MM format
            $updateData['note'] = ($lastAttendance->note ?? '') . " [Auto-completed at {$displayTime} due to incomplete attendance]";
            $lastAttendance->update($updateData);
            return true;
        }

        return false;
    }
}