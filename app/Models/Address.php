<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Address extends Model
{
    use HasFactory, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'user_id',
        'label',
        'full_name',
        'phone',
        'address_line1',
        'address_line2',
        'area',
        'city',
        'postal_code',
        'division',
        'country',
        'latitude',
        'longitude',
        'is_default',
        'is_billing_address',
        'is_shipping_address',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'is_default' => 'boolean',
        'is_billing_address' => 'boolean',
        'is_shipping_address' => 'boolean',
    ];

    /**
     * Get the user that owns the address.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get full address as string
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address_line1,
            $this->address_line2,
            $this->area,
            $this->city,
            $this->postal_code,
            $this->division,
            $this->country,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Set as default address (unsets other defaults for user)
     */
    public function setAsDefault(): void
    {
        // Unset other default addresses for this user
        static::where('user_id', $this->user_id)
            ->where('id', '!=', $this->id)
            ->update(['is_default' => false]);

        // Set this as default
        $this->update(['is_default' => true]);
    }

    /**
     * Scope to get default addresses
     */
    public function scopeDefault($query)
    {
        return $query->where('is_default', true);
    }

    /**
     * Scope to get shipping addresses
     */
    public function scopeShipping($query)
    {
        return $query->where('is_shipping_address', true);
    }

    /**
     * Scope to get billing addresses
     */
    public function scopeBilling($query)
    {
        return $query->where('is_billing_address', true);
    }
}
