<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    protected $guarded = ['id'];

    // এই লাইনগুলো নিশ্চিত করুন
    protected $casts = [
        'dob' => 'date'
    ];

    // রিলেশনশিপ: প্রোফাইলের মালিক কে?
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // মিডিয়া রিলেশন (যদি ফটো থাকে)
    public function photo()
    {
        return $this->belongsTo(MediaFile::class, 'profile_photo_id');
    }
}