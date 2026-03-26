<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     * হ্যাকারদের রিডাইরেক্ট ট্র্যাপ থেকে বাঁচাতে এটি অত্যন্ত গুরুত্বপূর্ণ।
     */
    protected function redirectTo(Request $request): ?string
    {
        // যদি রিকোয়েস্টটি এপিআই হয় অথবা JSON আশা করে, তবে কোনো রিডাইরেক্ট হবে না।
        // এটি হ্যাকারের সেই "Route [login] not defined" এররটি চিরতরে বন্ধ করবে।
        return $request->expectsJson() ? null : null;
    }
}