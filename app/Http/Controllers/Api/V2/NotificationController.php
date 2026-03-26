<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    /**
     * Get All Notifications (Unread first)
     */
    public function index(Request $request)
    {
        // ফ্রন্টএন্ডে বেলের (Bell Icon) জন্য
        $notifications = $request->user()->notifications()->paginate(20);
        
        return $this->sendSuccess([
            'unread_count' => $request->user()->unreadNotifications->count(),
            'list' => $notifications
        ]);
    }

    /**
     * Mark as Read (One click action)
     */
    public function markAsRead(Request $request)
    {
        if ($request->id) {
            // Mark specific
            $request->user()->notifications()->where('id', $request->id)->first()?->markAsRead();
        } else {
            // Mark all (Reduce labour)
            $request->user()->unreadNotifications->markAsRead();
        }

        return $this->sendSuccess(null, 'Marked as read');
    }
}