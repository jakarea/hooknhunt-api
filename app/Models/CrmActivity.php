<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CrmActivity extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'schedule_at' => 'datetime',
        'is_done' => 'boolean',
    ];

    // স্টাফ যে কাজটা করেছে
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}