<?php

namespace App\Modules\System\Models;

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

    // মিডিয়া রিলেশন - রিমুভড ফর ইন্ডিপেন্ডেন্স (MediaFile অন্য মডিউলে থাকবে)
    // public function photo()
    // {
    //     return $this->belongsTo(MediaFile::class, 'profile_photo_id');
    // }
}