<?php

namespace App\Traits;

use Illuminate\Http\Request;

/**
 * HTML Sanitization Trait
 *
 * Automatically sanitizes input data to prevent XSS and HTML entity encoding issues.
 * Strips HTML from plain text fields while preserving HTML in rich text editor fields.
 *
 * @package App\Traits
 */
trait HtmlSanitizer
{
    /**
     * Fields that should allow HTML (rich text editor fields)
     * Override this property in your controller or model to specify allowed HTML fields.
     *
     * @var array
     */
    protected $richTextFields = [
        // Products - ONLY these fields allow HTML
        'description', 'description_bn',
        'warranty_details',
        'highlights', 'highlights_bn',
        'attributes', 'attributes_bn',

        // Categories
        'category_description', 'category_description_bn',

        // Reviews
        'review', 'comment',
    ];

    /**
     * Fields that must NEVER contain HTML (plain text only)
     * These will be aggressively sanitized to strip ALL HTML.
     *
     * @var array
     */
    protected $plainTextFields = [
        // Products
        'name', 'retail_name', 'wholesale_name',
        'retail_name_bn', 'wholesale_name_bn',
        'product_code', 'sku',
        'slug',
        'seo_title',
        'video_url',

        // Categories
        'category_name', 'category_name_bn',
        'category_slug',

        // Brands
        'brand_name', 'brand_slug',

        // Orders
        'customer_name', 'invoice_no',
        'shipping_name', 'billing_name',
    ];

    /**
     * Sanitize request data
     *
     * @param Request $request
     * @param array $additionalRichTextFields Additional fields that should allow HTML
     * @param array $additionalPlainTextFields Additional fields that should NOT allow HTML
     * @return array Sanitized data
     */
    protected function sanitizeRequest(
        Request $request,
        array $additionalRichTextFields = [],
        array $additionalPlainTextFields = []
    ): array {
        $data = $request->all();

        $richText = array_merge($this->richTextFields, $additionalRichTextFields);
        $plainText = array_merge($this->plainTextFields, $additionalPlainTextFields);

        foreach ($data as $key => $value) {
            $data[$key] = $this->sanitizeField($key, $value, $richText, $plainText);
        }

        return $data;
    }

    /**
     * Sanitize a single field based on its type
     *
     * @param string $field Field name
     * @param mixed $value Field value
     * @param array $richTextFields Fields that allow HTML
     * @param array $plainTextFields Fields that must NOT allow HTML
     * @return mixed Sanitized value
     */
    protected function sanitizeField(string $field, $value, array $richTextFields, array $plainTextFields)
    {
        // Handle null values
        if ($value === null) {
            return null;
        }

        // Handle arrays (like highlights, attributes, etc.)
        if (is_array($value)) {
            return array_map(function ($item) use ($field, $richTextFields, $plainTextFields) {
                return $this->sanitizeScalarValue($field, $item, $richTextFields, $plainTextFields);
            }, $value);
        }

        // Handle scalar values
        return $this->sanitizeScalarValue($field, $value, $richTextFields, $plainTextFields);
    }

    /**
     * Sanitize a scalar value (string, number, etc.)
     *
     * @param string $field Field name
     * @param mixed $value Scalar value
     * @param array $richTextFields Fields that allow HTML
     * @param array $plainTextFields Fields that must NOT allow HTML
     * @return mixed Sanitized value
     */
    protected function sanitizeScalarValue(string $field, $value, array $richTextFields, array $plainTextFields)
    {
        // If not a string, return as-is
        if (!is_string($value)) {
            return $value;
        }

        // Check if this is a rich text field
        if (in_array($field, $richTextFields)) {
            return $this->sanitizeRichText($value);
        }

        // Check if this is a plain text field (or unknown field - default to plain text)
        if (in_array($field, $plainTextFields) || !in_array($field, $richTextFields)) {
            return $this->sanitizePlainText($value);
        }

        return $value;
    }

    /**
     * Sanitize rich text content
     * Allows safe HTML tags and attributes, strips dangerous content
     *
     * @param ?string $html
     * @return string
     */
    protected function sanitizeRichText(?string $html): string
    {
        // Handle null values
        if ($html === null) {
            return '';
        }

        // First, decode any existing HTML entities to prevent double-encoding
        $html = html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Allow only safe HTML tags
        $allowedTags = [
            'p', 'br', 'strong', 'b', 'em', 'i', 'u',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'a' => ['href', 'title', 'target'],
            'span' => ['class', 'style'],
            'div' => ['class', 'style'],
            'table' => ['class'],
            'tr', 'td', 'th',
            'img' => ['src', 'alt', 'title', 'width', 'height'],
        ];

        // Strip dangerous tags and attributes
        $html = strip_tags($html, '<' . implode('><', array_keys($allowedTags)) . '>');

        // Remove dangerous attributes (onclick, onerror, etc.)
        $html = preg_replace('/\s*on\w+\s*=\s*["\'][^"\']*["\']/', '', $html);
        $html = preg_replace('/\s*javascript:\s*[^\s"\'>]*/', '', $html);

        // Remove any remaining HTML entities that shouldn't be there
        $html = $this->cleanMalformedEntities($html);

        // Encode special characters but preserve allowed HTML
        return $html;
    }

    /**
     * Sanitize plain text content
     * Strips ALL HTML and HTML entities
     *
     * @param ?string $text
     * @return string
     */
    protected function sanitizePlainText(?string $text): string
    {
        // Handle null values
        if ($text === null) {
            return '';
        }

        // First, decode any existing HTML entities
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Remove all HTML tags
        $text = strip_tags($text);

        // Clean any malformed entities (like &amp;amp;amp;)
        $text = $this->cleanMalformedEntities($text);

        // Normalize whitespace
        $text = preg_replace('/\s+/', ' ', $text);
        $text = trim($text);

        return $text;
    }

    /**
     * Clean malformed HTML entities
     * Fixes issues like &amp;amp;amp; → &
     *
     * @param ?string $text
     * @return string
     */
    protected function cleanMalformedEntities(?string $text): string
    {
        // Handle null values
        if ($text === null) {
            return '';
        }

        // Repeatedly decode until no more entities exist (handles &amp;amp;amp; etc.)
        $prev = '';
        while ($text !== $prev) {
            $prev = $text;
            $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        // Encode only the essential entities once
        $text = htmlspecialchars($text, ENT_NOQUOTES, 'UTF-8');

        return $text;
    }

    /**
     * Decode HTML entities without re-encoding
     * Use this for fields that should preserve HTML (e.g., tracking codes, scripts)
     *
     * @param ?string $text
     * @return string
     */
    protected function decodeHtmlEntities(?string $text): string
    {
        // Handle null values
        if ($text === null) {
            return '';
        }

        // Repeatedly decode until no more entities exist (handles &amp;amp;amp; etc.)
        $prev = '';
        while ($text !== $prev) {
            $prev = $text;
            $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }

        return $text;
    }

    /**
     * Merge rich text fields for a specific entity type
     *
     * @param string $entityType 'product', 'category', 'brand', etc.
     * @return array
     */
    protected function getRichTextFieldsForEntity(string $entityType): array
    {
        return match($entityType) {
            'product' => [
                'description', 'description_bn',
                'warranty_details',
                'highlights', 'highlights_bn',
                'attributes', 'attributes_bn',
            ],
            'category' => [
                'description', 'description_bn',
            ],
            'review' => [
                'review', 'comment',
            ],
            default => [],
        };
    }

    /**
     * Merge plain text fields for a specific entity type
     *
     * @param string $entityType 'product', 'category', 'brand', etc.
     * @return array
     */
    protected function getPlainTextFieldsForEntity(string $entityType): array
    {
        return match($entityType) {
            'product' => [
                'name', 'retail_name', 'wholesale_name',
                'retail_name_bn', 'wholesale_name_bn',
                'product_code',
                'slug',
                'seo_title',
                'video_url',
            ],
            'category' => [
                'name', 'name_bn',
                'slug',
            ],
            'brand' => [
                'name',
                'slug',
            ],
            default => [],
        };
    }
}
