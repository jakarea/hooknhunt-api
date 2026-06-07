<?php

namespace App\Http\Middleware;

use App\Traits\HtmlSanitizer;
use Closure;
use Illuminate\Http\Request;

/**
 * Sanitize Input Middleware
 *
 * Automatically sanitizes all incoming request data to prevent XSS and HTML encoding issues.
 * Strips HTML from plain text fields while preserving HTML in rich text editor fields.
 *
 * Usage:
 * - Apply globally in routes/web.php or routes/api.php
 * - Apply to specific route groups
 * - Exclude routes that don't need sanitization
 *
 * @package App\Http\Middleware
 */
class SanitizeInput
{
    use HtmlSanitizer;

    /**
     * Routes to skip sanitization
     * Add routes that handle file uploads, webhooks, etc.
     *
     * @var array
     */
    protected $except = [
        '*/upload*',
        '*/webhook*',
        '*/stripe/*',
        '*/sslcommerz/*',
        '*/payment/*',
    ];

    /**
     * Handle an incoming request.
     *
     * @param Request $request
     * @param Closure $next
     * @return mixed
     */
    public function handle(Request $request, Closure $next)
    {
        // Skip sanitization for excluded routes
        if ($this->shouldSkip($request)) {
            return $next($request);
        }

        // Only sanitize POST, PUT, PATCH requests
        if (in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
            $this->sanitizeRequestData($request);
        }

        return $next($request);
    }

    /**
     * Determine if sanitization should be skipped for this request
     *
     * @param Request $request
     * @return bool
     */
    protected function shouldSkip(Request $request): bool
    {
        foreach ($this->except as $pattern) {
            if ($request->is($pattern)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitize the request data
     *
     * @param Request $request
     * @return void
     */
    protected function sanitizeRequestData(Request $request): void
    {
        $sanitized = [];

        foreach ($request->all() as $key => $value) {
            $sanitized[$key] = $this->sanitizeFieldByContext($key, $value, $request);
        }

        // Replace the request data with sanitized data
        $request->merge($sanitized);
    }

    /**
     * Sanitize a field based on its context (route, field name, etc.)
     *
     * @param string $field
     * @param mixed $value
     * @param Request $request
     * @return mixed
     */
    protected function sanitizeFieldByContext(string $field, $value, Request $request)
    {
        // Handle null values
        if ($value === null) {
            return null;
        }

        // Handle arrays
        if (is_array($value)) {
            return array_map(fn($item) => $this->sanitizeFieldByContext($field, $item, $request), $value);
        }

        // Handle non-string values
        if (!is_string($value)) {
            return $value;
        }

        // Determine field type based on naming convention and context
        if ($this->isRichTextField($field)) {
            return $this->sanitizeRichText($value);
        }

        // Default to plain text sanitization
        return $this->sanitizePlainText($value);
    }

    /**
     * Determine if a field should be treated as rich text
     *
     * @param string $field
     * @return bool
     */
    protected function isRichTextField(string $field): bool
    {
        // Known rich text fields (ONLY these allow HTML)
        $richTextFields = [
            'description', 'description_bn',
            'warranty_details',
            'highlights', 'highlights_bn',
            'attributes', 'attributes_bn',
            'content', 'content_bn',
            'review', 'comment',
            'message', 'body',
            'note', 'notes',
        ];

        // Check exact match
        if (in_array($field, $richTextFields)) {
            return true;
        }

        // Check for field suffixes
        $richTextSuffixes = ['content', 'details', 'body', 'review', 'comment', 'code'];
        foreach ($richTextSuffixes as $suffix) {
            if (str_ends_with($field, $suffix)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitize rich text content
     * Allows safe HTML tags and attributes
     *
     * @param string $html
     * @return string
     */
    protected function sanitizeRichText(string $html): string
    {
        // Decode existing HTML entities to prevent double-encoding
        $html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Fix malformed entities (like &amp;amp;amp;)
        $html = $this->cleanMalformedEntities($html);

        // Allow only safe HTML tags
        $allowedTags = implode('>', [
            'p', 'br', 'hr',
            'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'blockquote', 'pre', 'code',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
            'a', 'span', 'div',
            'img',
            'script', 'noscript', // Required for tracking codes (Facebook Pixel, Google Analytics, GTM)
        ]);

        $html = strip_tags($html, "<{$allowedTags}>");

        // Remove dangerous attributes
        $html = preg_replace('/\s*on\w+\s*=\s*["\'][^"\']*["\']/i', '', $html);
        $html = preg_replace('/\s*javascript:\s*[^\s"\'>]*/i', '', $html);
        $html = preg_replace('/<[^>]+data\s*:[^>]+>/i', '', $html);

        return $html;
    }

    /**
     * Sanitize plain text content
     * Strips ALL HTML and HTML entities
     *
     * @param string $text
     * @return string
     */
    protected function sanitizePlainText(string $text): string
    {
        // Decode existing entities
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Clean malformed entities
        $text = $this->cleanMalformedEntities($text);

        // Strip all HTML tags
        $text = strip_tags($text);

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);

        return $text;
    }

    /**
     * Clean malformed HTML entities
     * Fixes issues like &amp;amp;amp; → &
     *
     * @param string $text
     * @return string
     */
    protected function cleanMalformedEntities(string $text): string
    {
        // Repeatedly decode until no more entities exist
        $prev = '';
        $iterations = 0;
        while ($text !== $prev && $iterations < 10) {
            $prev = $text;
            $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $iterations++;
        }

        // Remove any remaining &amp; patterns that indicate malformed entities
        $text = preg_replace('/&amp;(amp;)+/', '&', $text);
        $text = preg_replace('/&quot;(quot;)+/', '"', $text);
        $text = preg_replace('/&apos;(apos;)+/', "'", $text);
        $text = preg_replace('/&lt;(lt;)+/', '<', $text);
        $text = preg_replace('/&gt;(gt;)+/', '>', $text);

        return $text;
    }
}
