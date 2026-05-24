<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class RateLimitOrderPlacement
{
    /**
     * Create a new middleware instance.
     */
    public function __construct(
        protected RateLimiter $limiter
    ) {}

    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @return mixed
     *
     * @throws \Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException
     */
    public function handle(Request $request, Closure $next)
    {
        $key = $this->resolveRequestSignature($request);

        if ($this->limiter->tooManyAttempts($key, $this->maxAttempts())) {
            Log::warning('Rate limit exceeded for order placement', [
                'ip' => $request->ip(),
                'key' => $key,
            ]);

            throw new TooManyRequestsHttpException(
                $this->resolveAvailableAt($key),
                'Too many order attempts. Please slow down and try again later.'
            );
        }

        $this->limiter->hit($key, $this->decayMinutes());

        return $next($request);
    }

    /**
     * Resolve request signature.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string
     */
    protected function resolveRequestSignature(Request $request): string
    {
        // Use IP address as primary identifier
        $signature = $request->ip();

        // Add user ID if authenticated
        if (auth()->check()) {
            $signature .= '|user:' . auth()->id();
        }

        // Add phone number if provided
        if ($request->has('customer_phone')) {
            $signature .= '|phone:' . $request->input('customer_phone');
        }

        return sha1('order:' . $signature);
    }

    /**
     * Resolve available retry after time.
     *
     * @param  string  $key
     * @return int
     */
    protected function resolveAvailableAt(string $key): int
    {
        return $this->limiter->availableIn($key);
    }

    /**
     * Get the number of max attempts per window.
     *
     * @return int
     */
    protected function maxAttempts(): int
    {
        return env('ORDER_RATE_LIMIT_MAX_ATTEMPTS', 10);
    }

    /**
     * Get the decay minutes for rate limit window.
     *
     * @return int
     */
    protected function decayMinutes(): int
    {
        return env('ORDER_RATE_LIMIT_DECAY_MINUTES', 60); // 1 hour window
    }
}
