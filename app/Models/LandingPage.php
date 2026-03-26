<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LandingPage extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    // JSON কলাম কাস্ট করার জন্য (Content Sections)
    protected $casts = [
        'content_sections' => 'array',
        'is_active' => 'boolean'
    ];
}