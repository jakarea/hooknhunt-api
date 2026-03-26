<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $guarded = ['id'];

    // ⚠️ PROBLEM: Auto-loading role was causing ghost data
    // Commented out - load role explicitly when needed
    // protected $with = ['role'];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Sanitize phone_verified_at - remove null bytes and invalid data
     */
    public function getPhoneVerifiedAtAttribute($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Remove null bytes and other non-printable characters
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);

        if (empty($cleaned)) {
            return null;
        }

        // Check if it's a valid date format before parsing
        // (prevents "Operations Manager" etc. from being parsed)
        if (!preg_match('/^\d{4}-\d{2}-\d{2}/', $cleaned)) {
            // Not a valid date format - return null
            \Log::warning('Invalid phone_verified_at format', [
                'user_id' => $this->id,
                'raw_value' => $value,
                'cleaned_value' => $cleaned
            ]);
            return null;
        }

        try {
            return \Carbon\Carbon::parse($cleaned);
        } catch (\Exception $e) {
            \Log::error('Failed to parse phone_verified_at', [
                'user_id' => $this->id,
                'value' => $cleaned,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Sanitize email_verified_at - remove null bytes and invalid data
     */
    public function getEmailVerifiedAtAttribute($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        // Remove null bytes and other non-printable characters
        $cleaned = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $value);

        if (empty($cleaned)) {
            return null;
        }

        // Check if it's a valid date format before parsing
        if (!preg_match('/^\d{4}-\d{2}-\d{2}/', $cleaned)) {
            // Not a valid date format - return null
            \Log::warning('Invalid email_verified_at format', [
                'user_id' => $this->id,
                'raw_value' => $value,
                'cleaned_value' => $cleaned
            ]);
            return null;
        }

        try {
            return \Carbon\Carbon::parse($cleaned);
        } catch (\Exception $e) {
            \Log::error('Failed to parse email_verified_at', [
                'user_id' => $this->id,
                'value' => $cleaned,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    public function role()
    {
        // Bypass the excludeSuperAdmin scope to allow loading super_admin role
        return $this->belongsTo(Role::class)->withSuperAdmin();
    }

    /**
     * Get all users including super_admin (use for specific backend operations only)
     * This is a passthrough scope since User model doesn't exclude super_admin by default
     */
    public function scopeWithSuperAdmin($query)
    {
        return $query;
    }

    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    public function staffProfile()
    {
        return $this->hasOne(StaffProfile::class);
    }

    /**
     * CRM: Customer profile relationship
     */
    public function customerProfile()
    {
        return $this->hasOne(CustomerProfile::class);
    }

    /**
     * CRM: Customer addresses
     */
    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    /**
     * CRM: Customer wallet
     */
    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    /**
     * CRM: Opportunities as customer
     */
    public function opportunities()
    {
        return $this->hasMany(Opportunity::class, 'customer_id');
    }

    /**
     * CRM: Quotations as customer
     */
    public function quotations()
    {
        return $this->hasMany(Quotation::class, 'customer_id');
    }

    /**
     * CRM: Activities assigned to or created by this user
     */
    public function crmActivities()
    {
        return $this->hasMany(CrmActivity::class, 'assigned_to');
    }

    /**
     * CRM: Leads created by this user
     */
    public function leads()
    {
        return $this->hasMany(Lead::class, 'created_by');
    }

    /**
     * CRM: Loyalty transactions
     */
    public function loyaltyTransactions()
    {
        return $this->hasMany(LoyaltyTransaction::class, 'customer_id');
    }

    public function directPermissions()
    {
        return $this->belongsToMany(Permission::class, 'permission_user');
    }

    /**
     * Check if user is Super Admin
     */
    public function isSuperAdmin(): bool
    {
        return $this->role && $this->role->slug === 'super_admin';
    }

    public function hasPermissionTo($slug): bool
    {
        // Super admins have all permissions
        if ($this->isSuperAdmin()) {
            return true;
        }

        // ১. প্রথমেই চেক করুন এই ইউজারের জন্য এই পারমিশনটি 'Block' করা কি না
        $isBlocked = $this->directPermissions()
                        ->where('slug', $slug)
                        ->where('is_blocked', 1)
                        ->exists();

        if ($isBlocked) {
            return false; // রোলে থাকলেও সে এটি করতে পারবে না
        }

        // ২. আগের মতো রোল এবং ডাইরেক্ট পারমিশন চেক করুন
        $rolePermissions = $this->role?->permissions()->pluck('slug')->toArray() ?? [];
        $directAllowed = $this->directPermissions()
                            ->where('is_blocked', 0)
                            ->pluck('slug')->toArray();

        return in_array($slug, array_merge($rolePermissions, $directAllowed));
    }

}