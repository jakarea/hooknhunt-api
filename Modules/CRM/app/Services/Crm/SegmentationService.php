<?php

namespace App\Modules\CRM\Services\Crm;

use App\Modules\CRM\Models\Customer;
use App\Modules\CRM\Models\CrmSegment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SegmentationService
{
    /**
     * Run RFM Analysis & Auto-Assign Segments
     * এই ফাংশনটি Cron Job এর মাধ্যমে প্রতি রাতে রান হবে।
     */
    
    public function runSegmentation()
    {
        // ১. সেগমেন্টগুলো নিশ্চিত করি
        $vipSegment = CrmSegment::firstOrCreate(['name' => 'VIP Customers'], ['is_auto' => true]);
        $dormantSegment = CrmSegment::firstOrCreate(['name' => 'Dormant (Inactive > 60 Days)'], ['is_auto' => true]);
        $newSegment = CrmSegment::firstOrCreate(['name' => 'New Customers'], ['is_auto' => true]);

        // ২. ডাটা ক্লিয়ার (Pivot Table)
        DB::table('customer_crm_segment')
            ->whereIn('crm_segment_id', [$vipSegment->id, $dormantSegment->id, $newSegment->id])
            ->delete();

        // ---------------------------------------------------------
        // LOGIC 1: VIP Customers
        // (যাদের টোটাল খরচ ৫০,০০০ এর বেশি অথবা ১০টির বেশি অর্ডার)
        // Use direct database access for module independence
        // ---------------------------------------------------------
        $vipCustomers = DB::table('sales_orders')
            ->select('customer_id')
            ->selectRaw('SUM(total_amount) as total_spent, COUNT(id) as total_orders')
            ->whereNotNull('customer_id')
            ->groupBy('customer_id')
            ->having('total_spent', '>', 50000)
            ->orHaving('total_orders', '>', 10)
            ->pluck('customer_id');

        $vipSegment->customers()->attach($vipCustomers);

        // ---------------------------------------------------------
        // LOGIC 2: Dormant (Inactive > 60 Days)
        // Use direct database access for module independence
        // ---------------------------------------------------------
        $sixtyDaysAgo = Carbon::now()->subDays(60);

        // ক. যারা গত ৬০ দিনে অন্তত একটি অর্ডার করেছে (Active Users)
        $activeCustomerIds = DB::table('sales_orders')
            ->where('created_at', '>=', $sixtyDaysAgo)
            ->pluck('customer_id')
            ->toArray();

        // খ. যারা ৬০ দিনের আগে অর্ডার করেছিল কিন্তু গত ৬০ দিনে করেনি
        // Use direct database access for module independence
        $dormantCustomers = DB::table('sales_orders')
            ->where('created_at', '<', $sixtyDaysAgo)
            ->whereNotIn('customer_id', $activeCustomerIds) // Active দের বাদ দিচ্ছি
            ->whereNotNull('customer_id')
            ->distinct()
            ->pluck('customer_id');

        $dormantSegment->customers()->attach($dormantCustomers);

        // ---------------------------------------------------------
        // LOGIC 3: New Customers (Last 30 Days)
        // ---------------------------------------------------------
        $thirtyDaysAgo = Carbon::now()->subDays(30);
        $newCustomers = \App\Modules\CRM\Models\Customer::where('created_at', '>=', $thirtyDaysAgo)->pluck('id');
        
        $newSegment->customers()->attach($newCustomers);

        return [
            'vip_count' => $vipCustomers->count(),
            'dormant_count' => $dormantCustomers->count(),
            'new_count' => $newCustomers->count(),
        ];
    }
}