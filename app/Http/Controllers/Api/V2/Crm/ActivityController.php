<?php

namespace App\Http\Controllers\Api\V2\Crm;

use App\Http\Controllers\Controller;
use App\Models\CrmActivity;
use App\Models\Lead;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ActivityController extends Controller
{
    use ApiResponse;

    /**
     * 1. Log an Activity (Call/Note)
     * User Flow: লিড প্রোফাইলে গিয়ে "Add Note/Call Log" এ ক্লিক করা।
     * এখানেই "Next Follow-up Date" সেট করা হবে।
     */
    public function store(Request $request)
    {
        // Permission check: Need crm.activities.create permission
        if (!auth()->user()->hasPermissionTo('crm.activities.create')) {
            return $this->sendError('You do not have permission to create activities.', null, 403);
        }

        $request->validate([
            'type' => 'required|in:call,meeting,note,email,whatsapp',
            'summary' => 'required|string|max:255',
            'schedule_at' => 'nullable|date', // Laravel's 'date' rule accepts ISO 8601
            'lead_id' => 'required_without:customer_id',
            'customer_id' => 'required_without:lead_id',
        ]);

        // Convert ISO datetime to MySQL format if needed
        $scheduleAt = $request->schedule_at;
        if ($scheduleAt && !is_null($scheduleAt)) {
            try {
                $scheduleAt = \Carbon\Carbon::parse($scheduleAt)->format('Y-m-d H:i:s');
            } catch (\Exception $e) {
                return $this->sendError('Invalid date format for schedule_at', [], 422);
            }
        }

        $activity = CrmActivity::create([
            'user_id' => Auth::id(), // কে নোট নিল
            'lead_id' => $request->lead_id,
            'customer_id' => $request->customer_id,
            'type' => $request->type,
            'summary' => $request->summary,
            'description' => $request->description,
            'schedule_at' => $scheduleAt,
            'is_done' => $scheduleAt ? false : true, // শিডিউল থাকলে কাজ বাকি (pending)
        ]);

        // লিডের স্ট্যাটাস অটোমেটিক আপডেট করা (অপশনাল লজিক)
        if ($request->lead_id && $request->type == 'call') {
            Lead::where('id', $request->lead_id)->update(['status' => 'contacted']);
        }

        return $this->sendSuccess($activity, 'Activity logged successfully');
    }

    /**
     * 2. My Daily Task List (Periodic Call List)
     * User Flow: স্টাফ ড্যাশবোর্ডে ক্লিক করবে "Today's Follow-ups".
     * এটি সেই লিস্ট দেবে যাদের সাথে আজ কথা বলার কথা।
     */
    public function myTasks(Request $request)
    {
        // Permission check: Need crm.activities.my_tasks permission
        if (!auth()->user()->hasPermissionTo('crm.activities.my_tasks')) {
            return $this->sendError('You do not have permission to view tasks.', null, 403);
        }

        $userId = Auth::id();
        
        $tasks = CrmActivity::with(['lead', 'customer'])
            ->where('user_id', $userId)
            ->where('is_done', false) // কাজ এখনো শেষ হয়নি
            ->whereNotNull('schedule_at')
            ->orderBy('schedule_at', 'asc');

        // Filter: Today, Overdue, Upcoming
        if ($request->filter == 'today') {
            $tasks->whereDate('schedule_at', now()->today());
        } elseif ($request->filter == 'overdue') {
            $tasks->whereDate('schedule_at', '<', now()->today());
        }

        return $this->sendSuccess($tasks->get(), "Your task list loaded");
    }

    /**
     * 3. Mark Task as Done
     * User Flow: কল দেওয়া শেষ হলে "Mark as Done" এ ক্লিক করবে।
     */
    public function markAsDone($id)
    {
        // Permission check: Need crm.activities.complete permission
        if (!auth()->user()->hasPermissionTo('crm.activities.complete')) {
            return $this->sendError('You do not have permission to complete activities.', null, 403);
        }

        $activity = CrmActivity::where('user_id', Auth::id())->findOrFail($id);
        
        $activity->update(['is_done' => true]);
        
        return $this->sendSuccess(null, 'Task marked as completed');
    }
}