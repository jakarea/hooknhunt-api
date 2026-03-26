<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmsLog extends Model
{
    protected $fillable = [
        'user_id',
        'request_id',
        'message',
        'recipients',
        'sender_id',
        'status',
        'charge',
        'scheduled_at',
        'response_data',
        'delivery_report',
    ];

    protected $casts = [
        'response_data' => 'array',
        'delivery_report' => 'array',
        'scheduled_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
