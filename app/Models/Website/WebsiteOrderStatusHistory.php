<?php

namespace App\Models\Website;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteOrderStatusHistory extends Model
{
    protected $table = 'website_order_status_histories';

    protected $fillable = [
        'order_id',
        'from_status',
        'to_status',
        'comment',
        'changed_by',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(WebsiteOrder::class, 'order_id');
    }

    public function changedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'changed_by');
    }

    public static function logChange(int $orderId, string $toStatus, ?string $fromStatus = null, ?string $comment = null, ?int $changedBy = null): self
    {
        return self::create([
            'order_id' => $orderId,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'comment' => $comment,
            'changed_by' => $changedBy,
        ]);
    }
}
