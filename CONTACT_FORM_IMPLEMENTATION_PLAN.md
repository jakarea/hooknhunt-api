# Contact Form Implementation Plan
**Hook & Hunt ERP - Storefront Contact Form**

---

## 📋 Current State Analysis

### Contact Form Fields
```typescript
// /storefront/src/app/contact/page.tsx
- Full Name * (required)
- Email Address * (required)
- Phone Number (optional)
- Subject * (required)
- Message * (required)
```

### Existing Infrastructure
✅ **Leads Table Exists** (`/hooknhunt-api/database/migrations/0001_01_01_000300_create_leads_table.php`)
```php
- id
- name (string)
- phone (string, 20 chars, indexed)
- email (string, nullable)
- source (string, default 'manual')
- ad_campaign_name (string, nullable)
- status (string, default 'new')
- assigned_to (foreign key to users, nullable)
- converted_customer_id (foreign key to customers, nullable)
- notes (text, nullable)
- created_at, updated_at
```

✅ **Lead Model Exists** (`/hooknhunt-api/app/Models/Lead.php`)
✅ **LeadController Exists** (`/hooknhunt-api/app/Http/Controllers/Api/V2/Crm/LeadController.php`)
✅ **Public API Route Structure** (`/api/v2/public/*`)

---

## 🎯 Implementation Strategy

### **Recommended Approach: Extend CRM Leads Module**

**Rationale:**
- Contact form submissions are sales leads
- Existing CRM infrastructure can manage these leads
- Staff assignment, status tracking, and conversion features already built
- Unified customer journey: Contact → Lead → Customer

---

## 📝 Implementation Tasks

### **Phase 1: Database Migration (Required)**

**Task 1.1**: Add `subject` field to `leads` table

**Migration File**: `database/migrations/2026_03_17_add_subject_to_leads_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('subject')->nullable()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('subject');
        });
    }
};
```

**Command to run:**
```bash
cd hooknhunt-api
php artisan make:migration add_subject_to_leads_table --table=leads
# Then add the code above and run:
php artisan migrate
```

---

### **Phase 2: Backend API Implementation**

**Task 2.1**: Update Lead Model

**File**: `/hooknhunt-api/app/Models/Lead.php`

```php
// Add to $fillable array
protected $fillable = [
    'name', 'phone', 'email', 'subject', // Add subject
    'source', 'ad_campaign_name', 'status',
    'assigned_to', 'converted_customer_id', 'notes'
];
```

---

**Task 2.2**: Add Public Contact Submission Endpoint

**File**: `/hooknhunt-api/routes/api.php`

Add inside the public routes group (after line 437):

```php
// Public Contact Form Submission
Route::post('contact/submit', 'Crm\LeadController@contactSubmit');
```

**Location**: After the checkout-capture route around line 437

---

**Task 2.3**: Implement Contact Submission Controller Method

**File**: `/hooknhunt-api/app/Http/Controllers/Api/V2/Crm/LeadController.php`

Add new method at the end of the class (before closing brace):

```php
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
        'email' => 'required|email|max:100',
        'phone' => 'nullable|string|min:11|max:15',
        'subject' => 'required|string|max:200',
        'message' => 'required|string|max:2000',
    ]);

    if ($validator->fails()) {
        return $this->sendError('Validation Error', $validator->errors(), 422);
    }

    try {
        // 2. Check if this person is already a customer
        $existingCustomer = Customer::where('email', $request->email)
            ->orWhere('phone', $request->phone)
            ->first();

        if ($existingCustomer) {
            // Log activity for existing customer
            $notes = "CONTACT FORM SUBMISSION\n";
            $notes .= "Subject: {$request->subject}\n";
            $notes .= "Message: {$request->message}\n";
            $notes .= "Source: contact_form";

            // You could create a CRM activity here if needed
            return $this->sendSuccess([
                'status' => 'existing_customer',
                'customer_id' => $existingCustomer->id
            ], 'Thank you for contacting us! Our team will get back to you soon.');
        }

        // 3. Check if lead already exists (by email or phone)
        $existingLead = Lead::where('email', $request->email)
            ->orWhere('phone', $request->phone)
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
                'lead_id' => $existingLead->id
            ], 'Thank you for contacting us! Our team will get back to you soon.');
        }

        // 4. Create new lead from contact form
        $lead = Lead::create([
            'name' => $request->name,
            'email' => $request->email,
            'phone' => $request->phone ?? null,
            'subject' => $request->subject,
            'source' => 'contact_form',
            'status' => 'new',
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
```

---

### **Phase 3: Storefront Frontend Implementation**

**Task 3.1**: Update API Client

**File**: `/storefront/src/lib/api.ts`

Add contact submit function to the API client:

```typescript
// Contact Form Submission
export async function submitContactForm(data: {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}): Promise<{ lead_id?: number; message: string }> {
  const response = await fetch(`${NEXT_PUBLIC_API_URL}/v2/public/contact/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to submit contact form');
  }

  return response.json();
}
```

---

**Task 3.2**: Update Contact Page with Form Handler

**File**: `/storefront/src/app/contact/page.tsx`

Replace the entire file content with:

```typescript
'use client';

import React, { useState } from 'react';
import { submitContactForm } from '@/lib/api';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await submitContactForm(formData);
      setSubmitStatus({
        type: 'success',
        message: response.message || 'Thank you for contacting us! We will get back to you soon.',
      });

      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error: any) {
      setSubmitStatus({
        type: 'error',
        message: error.message || 'Failed to submit form. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] py-12 sm:py-16">
      <div className="max-w-[1344px] mx-auto px-4 lg:px-8 xl:px-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 dark:text-white mb-3 sm:mb-4">
            Contact Us
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* Contact Info - Left Side */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* ... Keep existing contact info cards ... */}
            {/* Phone, Email, Location cards remain unchanged */}
          </div>

          {/* Contact Form - Right Side */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-sm p-5 sm:p-8">

              {/* Success/Error Messages */}
              {submitStatus.type && (
                <div className={`mb-6 p-4 rounded-lg ${
                  submitStatus.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200'
                    : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200'
                }`}>
                  <p className="text-sm font-medium">{submitStatus.message}</p>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#bc1215] transition-colors bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#bc1215] transition-colors bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 text-sm"
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="mb-4 sm:mb-6">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="01712345678"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#bc1215] transition-colors bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 text-sm"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-4 sm:mb-6">
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#bc1215] transition-colors bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 text-sm"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="mb-4 sm:mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:border-[#bc1215] transition-colors bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-gray-100 text-sm resize-none"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 py-3 bg-[#bc1215] text-white font-semibold rounded-lg hover:bg-[#8a0e10] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Social Links - Keep existing */}
      </div>
    </div>
  );
}
```

---

### **Phase 4: Admin Panel (Optional but Recommended)**

**Task 4.1**: Filter Leads by Source

Add a filter in the CRM Leads page to show "Contact Form" submissions separately.

**File**: `/hooknhunt-api/resources/js/app/admin/crm/leads/page.tsx`

Add filter option:
```typescript
const sourceOptions = [
  { value: 'all', label: 'All Sources' },
  { value: 'contact_form', label: 'Contact Form' },
  { value: 'checkout_interceptor', label: 'Checkout Abandoned' },
  { value: 'manual', label: 'Manual Entry' },
];
```

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     STOREFRONT                              │
│                   Contact Form                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Name    │  │  Email   │  │ Subject  │  │ Message  │  │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘  └─────┬────┘  │
│        │             │             │             │        │
│        └─────────────┴─────────────┴─────────────┘        │
│                           │                                 │
└───────────────────────────┼─────────────────────────────────┘
                            │ POST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Laravel)                          │
│         /api/v2/public/contact/submit                       │
│                           │                                 │
│            ┌──────────────┴──────────────┐                 │
│            │   LeadController::          │                 │
│            │   contactSubmit()           │                 │
│            └──────────────┬──────────────┘                 │
│                           │                                 │
│            ┌──────────────┴──────────────┐                 │
│            │                             │                 │
│      Check Customer?              Check Lead?               │
│            │                             │                 │
│      Yes → Log Activity          Yes → Update Lead          │
│            │                             │                 │
│            └──────────┬──────────────────┘                 │
│                       │ No                                 │
│                       ▼                                    │
│              Create New Lead                               │
│              source='contact_form'                          │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CRM LEADS TABLE                          │
│  ┌────────────────────────────────────────────────────┐    │
│  │ id: 123                                            │    │
│  │ name: "John Doe"                                    │    │
│  │ email: "john@example.com"                           │    │
│  │ phone: "01712345678"                                │    │
│  │ subject: "Product Inquiry"                          │    │
│  │ source: "contact_form"                              │    │
│  │ status: "new"                                       │    │
│  │ notes: "I'm interested in fishing rods..."          │    │
│  │ assigned_to: NULL (waiting for assignment)          │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  ADMIN PANEL (CRM)                          │
│         Staff can view, assign, follow up                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Testing Checklist

### Backend Testing
```bash
cd hooknhunt-api

# 1. Run migration
php artisan migrate

# 2. Test API endpoint
curl -X POST http://localhost:8000/api/v2/public/contact/submit \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "01712345678",
    "subject": "Test Inquiry",
    "message": "This is a test message from the contact form."
  }'

# 3. Check database
php artisan tinker
>>> $lead = App\Models\Lead::latest()->first();
>>> $lead->subject;  // Should show "Test Inquiry"
>>> $lead->source;   // Should show "contact_form"
```

### Frontend Testing
```bash
cd storefront

# 1. Start dev server
npm run dev

# 2. Navigate to
http://localhost:3000/contact

# 3. Fill form and submit
# 4. Check for success message
# 5. Verify form resets
```

---

## 🚀 Deployment Steps

1. **Backend Changes**
   ```bash
   cd hooknhunt-api
   git add .
   git commit -m "feat: add contact form submission to CRM leads"
   git push
   ```

2. **Run Migration on Production**
   ```bash
   ssh production-server
   cd /path/to/hooknhunt-api
   php artisan migrate --force
   ```

3. **Frontend Changes**
   ```bash
   cd storefront
   npm run build
   # Deploy build to production
   ```

---

## 📞 Contact Information Display

The contact page shows:
- **Phone**: 01841544590 (Sat-Thu, 9am-6pm)
- **Email**: support@hooknhunt.com (24-hour response)
- **Location**: Dhaka, Bangladesh

Make sure these are up to date or move to database settings for easy management.

---

## ✅ Completion Checklist

- [ ] Create migration for `subject` field
- [ ] Update Lead model `$fillable` array
- [ ] Add public route to `routes/api.php`
- [ ] Implement `contactSubmit()` method in LeadController
- [ ] Test API endpoint with Postman/curl
- [ ] Update storefront API client (`api.ts`)
- [ ] Update contact page with form handler
- [ ] Test form submission end-to-end
- [ ] Add success/error UI feedback
- [ ] Verify leads appear in CRM admin panel
- [ ] (Optional) Add email notifications for new submissions

---

## 📝 Notes

- **No Authentication Required**: Public endpoint means anyone can submit
- **Spam Protection**: Consider adding reCAPTCHA or rate limiting
- **Email Notifications**: Currently commented out - implement when ready
- **Lead Assignment**: Staff can assign leads to themselves in CRM
- **Status Tracking**: Lead progresses through: new → contacted → qualified → converted/lost
- **Duplicate Handling**: Updates existing leads instead of creating duplicates
