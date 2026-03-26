<?php

namespace App\Http\Controllers\Api\V2\Crm;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Customer;
use App\Models\Wallet;
use App\Models\CrmActivity;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class LeadController extends Controller
{
    use ApiResponse;

    /**
     * 1. All Leads List (With Filters)
     */
    public function index(Request $request)
    {
        // Permission check: Need crm.leads.index permission
        if (!auth()->user()->hasPermissionTo('crm.leads.index')) {
            return $this->sendError('You do not have permission to view leads.', null, 403);
        }

        // Always load assignedAgent and pending scheduled activities
        $query = Lead::with('assignedAgent:id,name', 'scheduledActivities');

        // Filter by Status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by Assigned Staff
        if ($request->has('assigned_to')) {
            $query->where('assigned_to', $request->assigned_to);
        }

        // Search by Name/Phone
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'LIKE', "%$search%")
                  ->orWhere('phone', 'LIKE', "%$search%");
            });
        }

        // Filter by Scheduled Activity Date
        if ($request->has('date')) {
            $query->whereHas('activities', function($q) use ($request) {
                $q->whereDate('schedule_at', $request->date)
                  ->where('is_done', false);
            });
        }

        return $this->sendSuccess($query->latest()->paginate(20));
    }

    /**
     * CRM Dashboard Stats
     */
    public function getStats()
    {
        // Permission check: Need crm.dashboard.view permission
        if (!auth()->user()->hasPermissionTo('crm.dashboard.view')) {
            return $this->sendError('You do not have permission to view CRM statistics.', null, 403);
        }

        try {
            // Lead stats
            $totalLeads = Lead::count();
            $newLeads = Lead::where('status', 'new')->count();
            $contactedLeads = Lead::where('status', 'contacted')->count();
            $qualifiedLeads = Lead::where('status', 'qualified')->count();
            $proposalLeads = Lead::where('status', 'proposal')->count();
            $negotiationLeads = Lead::where('status', 'negotiation')->count();
            $convertedLeads = Lead::where('status', 'converted')->count();
            $lostLeads = Lead::where('status', 'lost')->count();

            $todayLeads = Lead::whereDate('created_at', today())->count();
            $thisMonthLeads = Lead::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();

            $conversionRate = $totalLeads > 0
                ? round(($convertedLeads / $totalLeads) * 100, 1)
                : 0;

            // Customer stats
            $totalCustomers = Customer::count();
            $activeCustomers = $totalCustomers; // All customers are considered active
            $thisMonthCustomers = Customer::whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();

            // Wallet stats - check if table exists first
            $walletStats = null;
            if (Schema::hasTable('wallets')) {
                $walletStats = Wallet::selectRaw('
                    COUNT(*) as active_wallets,
                    COALESCE(SUM(CASE WHEN balance >= 0 THEN balance ELSE 0 END), 0) as total_balance,
                    COALESCE(SUM(total_credited), 0) as total_credits,
                    COALESCE(SUM(total_debited), 0) as total_debits
                ')->first();
            } else {
                // Return default values if table doesn't exist
                $walletStats = (object) [
                    'active_wallets' => 0,
                    'total_balance' => 0,
                    'total_credits' => 0,
                    'total_debits' => 0,
                ];
            }

            // Recent leads
            $recentLeads = Lead::latest()
                ->limit(5)
                ->get()
                ->map(function ($lead) {
                    return [
                        'id' => $lead->id,
                        'name' => $lead->name,
                        'phone' => $lead->phone,
                        'email' => $lead->email,
                        'status' => $lead->status,
                        'source' => $lead->source,
                        'created_at' => $lead->created_at->toIso8601String(),
                    ];
                });

            // Recent activities - check if table exists
            $recentActivities = collect([]);
            if (Schema::hasTable('crm_activities')) {
                $recentActivities = CrmActivity::with('lead')
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(function ($activity) {
                        return [
                            'id' => $activity->id,
                            'leadName' => $activity->lead?->name ?? 'Unknown',
                            'type' => $activity->type,
                            'summary' => $activity->summary,
                            'schedule_at' => $activity->schedule_at?->toIso8601String(),
                            'created_at' => $activity->created_at->toIso8601String(),
                        ];
                    });
            }

            $stats = [
                'leads' => [
                    'total' => $totalLeads,
                    'new' => $newLeads,
                    'contacted' => $contactedLeads,
                    'qualified' => $qualifiedLeads,
                    'proposal' => $proposalLeads,
                    'negotiation' => $negotiationLeads,
                    'converted' => $convertedLeads,
                    'lost' => $lostLeads,
                    'today' => $todayLeads,
                    'thisMonth' => $thisMonthLeads,
                    'conversionRate' => $conversionRate,
                ],
                'customers' => [
                    'total' => $totalCustomers,
                    'active' => $activeCustomers,
                    'thisMonth' => $thisMonthCustomers,
                ],
                'wallet' => [
                    'totalBalance' => (float) $walletStats->total_balance,
                    'totalCredits' => (float) $walletStats->total_credits,
                    'totalDebits' => (float) $walletStats->total_debits,
                    'activeWallets' => (int) $walletStats->active_wallets,
                ],
                'recentLeads' => $recentLeads,
                'recentActivities' => $recentActivities,
            ];

            return $this->sendSuccess($stats, 'CRM stats retrieved successfully');
        } catch (\Exception $e) {
            Log::error('CRM Stats Error: ' . $e->getMessage());
            return $this->sendError('Failed to retrieve CRM stats: ' . $e->getMessage(), [], 500);
        }
    }

    /**
     * 2. Store New Lead (Manual Entry)
     */
    public function store(Request $request)
    {
        // Permission check: Need crm.leads.create permission
        if (!auth()->user()->hasPermissionTo('crm.leads.create')) {
            return $this->sendError('You do not have permission to create leads.', null, 403);
        }

        $request->validate([
            'name' => 'required|string|max:100',
            'phone' => 'required|unique:leads,phone',
            'source' => 'nullable',
        ]);

        $lead = Lead::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'source' => $request->source ?? 'manual',
            'status' => 'new',
            'assigned_to' => Auth::id(),
            'notes' => $request->notes
        ]);

        return $this->sendSuccess($lead, 'Lead created successfully');
    }

    /**
     * 3. Show Single Lead details
     */
    public function show($id)
    {
        // Permission check: Need crm.leads.show or crm.leads.index permission
        if (!auth()->user()->hasPermissionTo('crm.leads.show') && !auth()->user()->hasPermissionTo('crm.leads.index')) {
            return $this->sendError('You do not have permission to view lead details.', null, 403);
        }

        $lead = Lead::with(['assignedAgent', 'activities.user'])->findOrFail($id);
        return $this->sendSuccess($lead);
    }

    /**
     * 4. Update Status / Assign Staff
     */
    public function update(Request $request, $id)
    {
        // Permission check: Need crm.leads.update permission
        if (!auth()->user()->hasPermissionTo('crm.leads.update')) {
            return $this->sendError('You do not have permission to update leads.', null, 403);
        }

        $lead = Lead::findOrFail($id);

        $lead->update($request->only([
            'name', 'email', 'phone',
            'status', 'assigned_to', 'notes'
        ]));

        return $this->sendSuccess($lead, 'Lead updated successfully');
    }

    /**
     * 5. Capture Partial Lead from Checkout (Interceptor)
     * URL: POST /api/v2/crm/leads/checkout-capture
     */
    public function captureCheckoutLead(Request $request)
    {
        // Permission check: Need crm.leads.capture permission
        if (!auth()->user()->hasPermissionTo('crm.leads.capture')) {
            return $this->sendError('You do not have permission to capture leads.', null, 403);
        }

        // 1. Strict Validation
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string|min:11|max:15',
            'name' => 'nullable|string|max:100',
            'product_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error', $validator->errors(), 422);
        }

        try {
            $phone = $request->phone;

            // 2. Check: Is this person already a Customer?
            $existingCustomer = Customer::where('phone', $phone)->first(); //
            
            if ($existingCustomer) {
                return $this->sendSuccess(
                    ['status' => 'existing_customer'], 
                    'User is already a loyal customer. No lead needed.'
                );
            }

            // 3. Check: Is this Lead already in our funnel?
            $existingLead = Lead::where('phone', $phone)->first();

            if ($existingLead) {
                // Scenario A: লিড আগেই কনভার্ট হয়ে গেছে বা লস্ট হয়েছে
                if (in_array($existingLead->status, ['converted', 'won', 'lost'])) {
                    return $this->sendSuccess(null, 'Lead already processed previously.');
                }
                
                // Scenario B: লিড এখনো প্রসেস হচ্ছে -> আপডেট করি
                $existingLead->update([
                    'updated_at' => now(),
                    'notes' => $existingLead->notes . " | Visited checkout again for Product ID: " . ($request->product_id ?? 'N/A')
                ]);
                
                return $this->sendSuccess($existingLead->id, 'Existing lead updated.');
            }

            // 4. Create New Lead (Ghost Customer)
            $lead = Lead::create([
                'name' => $request->name ?? 'Guest User',
                'phone' => $phone,
                'source' => 'checkout_interceptor',
                'status' => 'attempted_purchase',
                'notes' => $request->product_id ? "Attempted to buy Product ID: " . $request->product_id : "Dropped off at checkout",
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return $this->sendSuccess($lead->id, 'Lead captured successfully.');

        } catch (\Exception $e) {
            Log::error("Checkout Interceptor Error: " . $e->getMessage());
            return $this->sendError('Internal System Error', [], 500);
        }
    }

    /**
     * 6. Delete Lead
     * URL: DELETE /api/v2/crm/leads/{id}
     */
    public function destroy($id)
    {
        $lead = Lead::findOrFail($id);

        // Permission check: Need crm.leads.delete permission
        if (!auth()->user()->hasPermissionTo('crm.leads.delete')) {
            return $this->sendError('You do not have permission to delete leads.', null, 403);
        }

        // Soft Delete (Lead history will remain in database)
        $lead->delete();

        return $this->sendSuccess(null, 'Lead deleted successfully');
    }

    /**
     * 7. Public Contact Form Submission (Guest Access)
     * URL: POST /api/v2/public/contact/submit
     * No authentication required - public endpoint
     */
    public function contactSubmit(Request $request)
    {
        // 1. Validation
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'phone' => 'required|string|min:11|max:15',
            'email' => 'nullable|email|max:100',
            'subject' => 'required|string|max:200',
            'message' => 'required|string|max:2000',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        if ($validator->fails()) {
            return $this->sendError('Validation Error', $validator->errors(), 422);
        }

        try {
            // 2. Check if this person is already a customer (by phone)
            $existingCustomer = Customer::where('phone', $request->phone)->first();

            if ($existingCustomer) {
                // Log activity for existing customer
                $notes = "CONTACT FORM SUBMISSION\n";
                $notes .= "Subject: {$request->subject}\n";
                $notes .= "Message: {$request->message}\n";
                $notes .= "Source: contact_form";

                // You could create a CRM activity here if needed
                return $this->sendSuccess([
                    'status' => 'existing_customer',
                    'customer_id' => $existingCustomer->id,
                    'message' => 'Thank you for contacting us! Our team will get back to you soon.'
                ], 'Thank you for contacting us! Our team will get back to you soon.');
            }

            // 3. Check if lead already exists (by phone or email)
            $existingLead = Lead::where('phone', $request->phone)
                ->when($request->filled('email'), function ($query) use ($request) {
                    return $query->orWhere('email', $request->email);
                })
                ->first();

            if ($existingLead) {
                // Update existing lead with new contact info
                $existingLead->update([
                    'subject' => $request->subject,
                    'notes' => $existingLead->notes
                        ? $existingLead->notes . "\n\n--- NEW CONTACT ---\n" . $request->message
                        : $request->message,
                    'status' => 'new', // Reset to new for follow-up
                    'updated_at' => now(),
                ]);

                return $this->sendSuccess([
                    'lead_id' => $existingLead->id,
                    'message' => 'Thank you for contacting us! Our team will get back to you soon.'
                ], 'Thank you for contacting us! Our team will get back to you soon.');
            }

            // 4. Create new lead from contact form
            $lead = Lead::create([
                'name' => $request->name,
                'email' => $request->email ?? null,
                'phone' => $request->phone,
                'subject' => $request->subject,
                'source' => 'contact_form',
                'status' => 'new',
                'priority' => $request->priority ?? 'high', // Default to high priority for contact form submissions
                'assigned_to' => null, // Will be assigned by admin
                'notes' => $request->message,
            ]);

            // 5. Optional: Send notification email to admins
            // Mail::to('admin@hooknhunt.com')->send(new NewContactFormSubmission($lead));

            return $this->sendSuccess([
                'lead_id' => $lead->id,
                'message' => 'Thank you for contacting us! Our team will get back to you soon.'
            ], 'Contact form submitted successfully', 201);

        } catch (\Exception $e) {
            Log::error("Contact Form Submission Error: " . $e->getMessage());
            return $this->sendError(
                'Failed to submit contact form. Please try again or call us directly.',
                [],
                500
            );
        }
    }
}