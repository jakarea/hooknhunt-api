<?php

namespace App\Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookLog extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'payload' => 'array', // JSON to Array automatically
    ];
}