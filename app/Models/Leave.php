<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use DateTimeInterface;

class Leave extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
    ];

    /**
     * Serialize dates to a standard format
     */
    protected function serializeDate(DateTimeInterface $date)
    {
        return $date->format('Y-m-d H:i:s');
    }

    // আবেদনকারী
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // অনুমোদনকারী
    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}