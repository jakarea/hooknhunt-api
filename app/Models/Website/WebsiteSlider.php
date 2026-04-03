<?php

namespace App\Models\Website;

use Illuminate\Database\Eloquent\Model;

class WebsiteSlider extends Model
{
    protected $table = 'website_sliders';

    protected $fillable = [
        'media_type',
        'image_url',
        'video_url',
        'capsule_title',
        'title',
        'sub_title',
        'features',
        'cta1_label',
        'cta1_link',
        'cta2_label',
        'cta2_link',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $appends = ['features_list'];

    public function getFeaturesListAttribute(): array
    {
        if (!$this->features) {
            return [];
        }

        return array_map('trim', explode(',', $this->features));
    }
}
