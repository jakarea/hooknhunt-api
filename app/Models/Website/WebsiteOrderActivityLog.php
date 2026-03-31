<?php

namespace App\Models\Website;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteOrderActivityLog extends Model
{
    protected $table = 'website_order_activity_logs';

    protected $fillable = [
        'order_id',
        'action',
        'description',
        'old_data',
        'new_data',
        'performed_by',
    ];

    protected $casts = [
        'old_data' => 'array',
        'new_data' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(WebsiteOrder::class, 'order_id');
    }

    public function performedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    public static function log(int $orderId, string $action, ?string $description = null, ?array $oldData = null, ?array $newData = null, ?int $performedBy = null): self
    {
        return self::create([
            'order_id' => $orderId,
            'action' => $action,
            'description' => $description,
            'old_data' => $oldData,
            'new_data' => $newData,
            'performed_by' => $performedBy,
        ]);
    }
}
