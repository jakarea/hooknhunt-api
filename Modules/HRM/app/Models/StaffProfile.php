<?php

namespace App\Modules\HRM\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class StaffProfile extends Model
{
    use SoftDeletes;

    // Mass assignment
    protected $fillable = [
        'user_id',
        'address',
        'division',
        'district',
        'thana',
        'department_id',
        'designation',
        'joining_date',
        'base_salary',
        'house_rent',
        'medical_allowance',
        'conveyance_allowance',
        'overtime_hourly_rate',
        'office_email',
        'office_email_password',
        'whatsapp_number',
        'dob',
        'gender',
        'profile_photo_id',
        // Bank account details for salary transfer
        'bank_account_name',
        'bank_account_number',
        'bank_name',
        'bank_branch',
        // Document uploads
        'national_id',
        'national_id_history',
        'photo_history',
        'resume',
    ];

    // Date casting
    protected $casts = [
        'dob' => 'date:Y-m-d', // Fixed timezone offset
        'joining_date' => 'date:Y-m-d', // Fixed timezone offset
        'national_id_history' => 'array', // JSON cast for national ID history
        'photo_history' => 'array', // JSON cast for photo history
    ];

    // Append accessors to JSON
    protected $appends = ['department_name'];

    // User relationship - Core module dependency (acceptable)
    public function user()
    {
        return $this->belongsTo(\App\Modules\System\Models\User::class);
    }

    // Department relationship - Internal HRM (good)
    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    // Accessor for department name
    public function getDepartmentNameAttribute()
    {
        return $this->department?->name;
    }

    // MediaFile relationships removed (CMS module dependency breaks independence)
    // Use profile_photo_id, national_id, resume directly or API calls to CMS module
    // public function photo()
    // {
    //     return $this->belongsTo(MediaFile::class, 'profile_photo_id');
    // }

    // public function nationalId()
    // {
    //     return $this->belongsTo(MediaFile::class, 'national_id');
    // }

    // public function resumeMedia()
    // {
    //     return $this->belongsTo(MediaFile::class, 'resume');
    // }
}
