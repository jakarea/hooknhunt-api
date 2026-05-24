<?php

namespace App\Modules\System\Models;

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

    // Core-only relationships (for module independence)

    public function profile()
    {
        return $this->hasOne(UserProfile::class);
    }

    public function addresses()
    {
        return $this->hasMany(Address::class);
    }

    /**
     * CRM Customer Profile relationship (CRM module dependency)
     */
    public function customerProfile()
    {
        return $this->hasOne(\App\Modules\CRM\Models\CustomerProfile::class);
    }

    /**
     * CRM Customer relationship (CRM module dependency)
     */
    public function customer()
    {
        return $this->hasOne(\App\Modules\CRM\Models\Customer::class);
    }

    public function directPermissions()
    {
        return $this->belongsToMany(Permission::class, 'permission_user');
    }

    /**
     * Get the user's role
     */
    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    /**
     * Check if user has permission (checks both direct and role-based permissions)
     */
    public function hasPermissionTo($slug): bool
    {
        // 1. Super admin has all permissions
        if ($this->role && $this->role->slug === 'super_admin') {
            return true;
        }

        // 2. Check direct permissions (user-specific, not blocked)
        $directAllowed = $this->directPermissions()
                            ->where('is_blocked', 0)
                            ->pluck('slug')->toArray();

        if (in_array($slug, $directAllowed)) {
            return true;
        }

        // 3. Check role-based permissions
        if ($this->role) {
            $rolePermissions = $this->role->permissions()->pluck('slug')->toArray();
            if (in_array($slug, $rolePermissions)) {
                return true;
            }
        }

        return false;
    }

}