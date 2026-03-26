<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CamelCaseResponse
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Only modify JSON responses
        if ($response->headers->get('content-type') === 'application/json') {
            $content = $response->getContent();

            try {
                $decoded = json_decode($content, true);

                if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                    $camelCaseContent = $this->convertKeysToCamelCase($decoded);
                    $response->setContent(json_encode($camelCaseContent));
                }
            } catch (\Exception $e) {
                // If camel case conversion fails, log but don't break the response
                \Log::error('CamelCaseResponse error: ' . $e->getMessage(), [
                    'content_preview' => substr($content, 0, 500)
                ]);
            }
        }

        return $response;
    }

    /**
     * Convert all array keys to camelCase recursively
     */
    private function convertKeysToCamelCase(array $array): array
    {
        $result = [];

        foreach ($array as $key => $value) {
            // Convert key to camelCase
            $camelKey = $this->toCamelCase($key);

            // Recursively convert nested arrays and objects
            if (is_array($value)) {
                $result[$camelKey] = $this->convertKeysToCamelCase($value);
            } elseif (is_object($value)) {
                // Convert objects to arrays first, then process
                $result[$camelKey] = $this->convertKeysToCamelCase((array) $value);
            } else {
                $result[$camelKey] = $value;
            }
        }

        return $result;
    }

    /**
     * Convert string to camelCase
     */
    private function toCamelCase(string $string): string
    {
        // Don't modify if already camelCase or doesn't contain underscores
        if (strpos($string, '_') === false) {
            return $string;
        }

        // Convert snake_case to camelCase
        return lcfirst(str_replace(' ', '', ucwords(str_replace('_', ' ', $string))));
    }
}
