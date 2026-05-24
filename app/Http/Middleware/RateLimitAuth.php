<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Cache\RateLimiter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

class RateLimitAuth
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
            throw new TooManyRequestsHttpException(
                $this->resolveAvailableAt($key),
                'Too many authentication attempts. Please try again later.'
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
        $signature = $request->ip();

        if ($request->has('phone')) {
            $signature .= '|' . $request->input('phone');
        }

        if ($request->has('email')) {
            $signature .= '|' . $request->input('email');
        }

        return sha1($signature);
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
     * Get the number of max attempts.
     *
     * @return int
     */
    protected function maxAttempts(): int
    {
        return env('AUTH_RATE_LIMIT_MAX_ATTEMPTS', 5);
    }

    /**
     * Get the decay minutes.
     *
     * @return int
     */
    protected function decayMinutes(): int
    {
        return env('AUTH_RATE_LIMIT_DECAY_MINUTES', 1);
    }
}
