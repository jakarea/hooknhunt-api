<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Courier extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // যদি জোন রেট রিলেশন থাকে
    public function zoneRates()
    {
        return $this->hasMany(CourierZoneRate::class);
    }
}