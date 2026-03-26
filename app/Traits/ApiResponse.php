<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;

trait ApiResponse
{
    /**
     * Success Response
     */
    protected function sendSuccess($data = null, $message = 'Success', $code = 200): JsonResponse
    {
        return response()->json([
            'status' => true,
            'message' => $message,
            'data' => $data,
            'errors' => null,
            'response_time' => round(microtime(true) - LARAVEL_START, 2),
        ], $code);
    }

    /**
     * Error Response
     */
    protected function sendError($message = 'Error', $errors = null, $code = 400): JsonResponse
    {
        return response()->json([
            'status' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
        ], $code);
    }

    /**
     * Validation Error Response (422)
     */
    protected function sendValidationError($errors, $message = 'Validation Errors'): JsonResponse
    {
        return response()->json([
            'status' => false,
            'message' => $message,
            'data' => null,
            'errors' => $errors,
        ], 422);
    }
}