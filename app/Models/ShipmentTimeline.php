<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShipmentTimeline extends Model
{
    // Mass assignment protection
    protected $guarded = ['id'];

    // Date casting
    protected $casts = [
        'happened_at' => 'datetime',
    ];

    /**
     * Relationship: Timeline belongs to a Shipment
     */
    public function shipment()
    {
        return $this->belongsTo(Shipment::class);
    }

    /**
     * Relationship: Update was done by a User (Admin/Staff)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}