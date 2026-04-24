<?php

namespace App\Models\Website;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteOrder extends Model
{
    use SoftDeletes;

    protected $table = 'sales_orders';

    protected $guarded = ['id'];

    // Status constants
    public const STATUS_PENDING    = 'pending';
    public const STATUS_DRAFT      = 'draft';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_ON_HOLD    = 'on_hold';
    public const STATUS_APPROVED   = 'approved';
    public const STATUS_ON_SHIPPING = 'on_shipping';
    public const STATUS_SHIPPED    = 'shipped';
    public const STATUS_DELIVERED  = 'delivered';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_CANCELLED  = 'cancelled';
    public const STATUS_RETURNED   = 'returned';
    public const STATUS_REFUNDED   = 'refunded';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_DRAFT,
        self::STATUS_PROCESSING,
        self::STATUS_ON_HOLD,
        self::STATUS_APPROVED,
        self::STATUS_ON_SHIPPING,
        self::STATUS_SHIPPED,
        self::STATUS_DELIVERED,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
        self::STATUS_RETURNED,
        self::STATUS_REFUNDED,
    ];

    public const STATUS_LABELS = [
        'pending'     => 'Pending',
        'draft'       => 'Draft',
        'processing'  => 'Processing',
        'on_hold'     => 'On Hold',
        'approved'    => 'Approved',
        'on_shipping' => 'On Shipping',
        'shipped'     => 'Shipped',
        'delivered'   => 'Delivered',
        'completed'   => 'Completed',
        'cancelled'   => 'Cancelled',
        'returned'    => 'Returned',
        'refunded'    => 'Refunded',
    ];

    public const STATUS_COLORS = [
        'pending'     => 'yellow',
        'draft'       => 'gray',
        'processing'  => 'blue',
        'on_hold'     => 'orange',
        'approved'    => 'teal',
        'on_shipping' => 'cyan',
        'shipped'     => 'indigo',
        'delivered'   => 'green',
        'completed'   => 'green',
        'cancelled'   => 'red',
        'returned'    => 'orange',
        'refunded'    => 'violet',
    ];

    protected $casts = [
        'external_data' => 'array',
        'total_weight' => 'decimal:2',
        'sent_to_courier' => 'boolean',
        'editing_locked' => 'boolean',
        'shipped_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = ['is_paid', 'due_amount', 'status_label'];

    // -----------------------------------------------
    // Scopes
    // -----------------------------------------------

    public function scopeWebsiteOnly($query)
    {
        return $query->whereIn('channel', ['retail_web', 'wholesale_web', 'app']);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeNotCancelled($query)
    {
        return $query->whereNotIn('status', [self::STATUS_CANCELLED, self::STATUS_RETURNED, self::STATUS_REFUNDED]);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING, self::STATUS_DRAFT, self::STATUS_PROCESSING,
            self::STATUS_ON_HOLD, self::STATUS_APPROVED, self::STATUS_ON_SHIPPING,
            self::STATUS_SHIPPED,
        ]);
    }

    // -----------------------------------------------
    // Relationships
    // -----------------------------------------------

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(WebsiteOrderItem::class, 'sales_order_id');
    }

    public function soldByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sold_by');
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(WebsiteOrderStatusHistory::class, 'order_id');
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(WebsiteOrderActivityLog::class, 'order_id');
    }

    // -----------------------------------------------
    // Accessors
    // -----------------------------------------------

    public function getIsPaidAttribute(): bool
    {
        return (float) $this->paid_amount >= (float) $this->total_amount;
    }

    public function getDueAmountAttribute(): float
    {
        return max(0, (float) $this->total_amount - (float) $this->paid_amount);
    }

    public function getStatusLabelAttribute(): string
    {
        return self::STATUS_LABELS[$this->status] ?? ucfirst(str_replace('_', ' ', $this->status));
    }

    // -----------------------------------------------
    // Business Logic: Status Transitions
    // -----------------------------------------------

    public static function allowedStatusTransitions(string $currentStatus): array
    {
        $transitions = [
            'pending'     => ['processing', 'draft', 'cancelled'],
            'draft'       => ['processing', 'cancelled'],
            'processing'  => ['approved', 'on_hold', 'cancelled'],
            'on_hold'     => ['processing', 'cancelled'],
            'approved'    => ['on_shipping', 'on_hold', 'cancelled'],
            'on_shipping' => ['shipped', 'on_hold', 'cancelled'],
            'shipped'     => ['delivered', 'cancelled'],
            'delivered'   => ['completed', 'returned'],
            'completed'   => ['returned'],
            'cancelled'   => ['pending'],
            'returned'    => ['refunded'],
            'refunded'    => [],
        ];

        return $transitions[$currentStatus] ?? [];
    }

    public function isEditable(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_DRAFT,
            self::STATUS_PROCESSING,
            self::STATUS_ON_HOLD,
        ]) && !$this->editing_locked;
    }

    public function canSendToCourier(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_PROCESSING,
            self::STATUS_APPROVED,
            self::STATUS_ON_SHIPPING,
        ]) && !$this->sent_to_courier;
    }

    // -----------------------------------------------
    // Helpers
    // -----------------------------------------------

    public function recalculateTotals(): void
    {
        $items = $this->items()->get();

        $subTotal = $items->sum('total_price');
        $totalWeight = $items->sum(function ($item) {
            return ($item->variant?->weight ?? 0) * $item->quantity;
        });
        $totalCost = $items->sum('total_cost');
        $totalProfit = $subTotal - $this->discount_amount - $totalCost - $this->delivery_charge;

        $this->sub_total = $subTotal;
        $this->total_weight = $totalWeight;
        $this->total_profit = $totalProfit;
        $this->total_amount = $subTotal - $this->discount_amount + $this->delivery_charge;

        // Update item weight from variant
        foreach ($items as $item) {
            $item->weight = $item->variant?->weight ?? 0;
            $item->saveQuietly();
        }

        if ((float) $this->paid_amount >= (float) $this->total_amount) {
            $this->payment_status = 'paid';
            $this->due_amount = 0;
        } else {
            $this->payment_status = ((float) $this->paid_amount > 0) ? 'partial' : 'unpaid';
            $this->due_amount = $this->total_amount - $this->paid_amount;
        }

        $this->save();
    }

    public function getShippingData(): array
    {
        return $this->external_data['shipping'] ?? [];
    }

    public function getCustomerData(): array
    {
        return $this->external_data['customer'] ?? [];
    }

    public function getPaymentData(): array
    {
        return $this->external_data['payment'] ?? [];
    }
}
