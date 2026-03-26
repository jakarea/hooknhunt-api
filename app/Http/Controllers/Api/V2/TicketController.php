<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use App\Models\SupportTicket;
use App\Models\TicketMessage;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class TicketController extends Controller
{
    use ApiResponse;

    /**
     * 1. List Tickets (Admin sees all, Customer sees own)
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $query = SupportTicket::with(['customer', 'messages']);

        // যদি ইউজার অ্যাডমিন না হয়, শুধু নিজের টিকিট দেখবে
        if (!$user->role || $user->role->id === 10) { // Retail Customer
             // Assuming user -> customer relation exists
            $customer = $user->customer; 
            if (!$customer) return $this->sendError('Customer profile not found');
            $query->where('customer_id', $customer->id);
        }

        // Filter by Status
        if ($request->status) {
            $query->where('status', $request->status);
        }

        return $this->sendSuccess($query->latest()->paginate(20));
    }

    /**
     * 2. Create Ticket (Customer)
     */
    public function store(Request $request)
    {
        $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'priority' => 'in:low,medium,high',
            'attachment' => 'nullable|file|mimes:jpg,png,pdf|max:2048'
        ]);

        $user = auth()->user();
        // Ensure user has a customer profile
        $customer = $user->customer ?? \App\Models\Customer::where('user_id', $user->id)->first();
        
        if (!$customer) {
            return $this->sendError('Only customers can create tickets.');
        }

        DB::beginTransaction();
        try {
            // A. Create Ticket Head
            $ticket = SupportTicket::create([
                'ticket_number' => 'TKT-' . rand(100000, 999999),
                'customer_id'   => $customer->id,
                'subject'       => $request->subject,
                'priority'      => $request->priority ?? 'medium',
                'status'        => 'open'
            ]);

            // B. Handle Attachment
            $attachmentPath = null;
            if ($request->hasFile('attachment')) {
                $attachmentPath = $request->file('attachment')->store('tickets', 'public');
            }

            // C. Create First Message
            TicketMessage::create([
                'ticket_id' => $ticket->id,
                'user_id'   => null, // Null means Customer sent it (or use $user->id if strict)
                'message'   => $request->message,
                'attachment'=> $attachmentPath
            ]);

            DB::commit();
            return $this->sendSuccess($ticket, 'Ticket created successfully!', 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->sendError('Failed to create ticket', ['error' => $e->getMessage()]);
        }
    }

    /**
     * 3. Show Details & Messages
     */
    public function show($id)
    {
        $ticket = SupportTicket::with(['messages.user', 'customer'])->findOrFail($id);
        return $this->sendSuccess($ticket);
    }

    /**
     * 4. Reply to Ticket (Admin or Customer)
     */
    public function reply(Request $request, $id)
    {
        $request->validate(['message' => 'required|string']);

        $ticket = SupportTicket::findOrFail($id);
        
        if ($ticket->status === 'closed') {
            return $this->sendError('Cannot reply to a closed ticket.');
        }

        TicketMessage::create([
            'ticket_id' => $ticket->id,
            'user_id'   => auth()->id(), // Logged in user (Admin or Customer)
            'message'   => $request->message,
            'attachment'=> $request->hasFile('attachment') ? $request->file('attachment')->store('tickets', 'public') : null
        ]);

        // Status Update Logic
        // If Admin replies, status -> answered
        // If Customer replies, status -> open
        $status = auth()->user()->role->id !== 10 ? 'answered' : 'open'; // 10 = Retail Customer
        $ticket->update(['status' => $status]);

        return $this->sendSuccess(null, 'Reply sent successfully');
    }

    /**
     * 5. Close Ticket
     */
    public function close($id)
    {
        $ticket = SupportTicket::findOrFail($id);
        $ticket->update(['status' => 'closed']);
        return $this->sendSuccess(null, 'Ticket closed.');
    }
}