<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class CompressResponse
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Check if the client accepts gzip encoding
        if (strpos($request->header('Accept-Encoding'), 'gzip') !== false) {
            // Only compress if response is large enough (> 1KB)
            if (strlen($response->getContent()) > 1024) {
                $response->header('Content-Encoding', 'gzip');
                $response->setContent(gzencode($response->getContent(), 9));
            }
        }

        return $response;
    }
}
