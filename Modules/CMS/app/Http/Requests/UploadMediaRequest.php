<?php

namespace App\Modules\CMS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Http\Exceptions\HttpResponseException;

class UploadMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check() && auth()->user()->can('cms.media.files.upload');
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|max:10240', // 10MB max
            'folder_id' => 'nullable|exists:media_folders,id',
            'alt_text' => 'nullable|string|max:255',
            'caption' => 'nullable|string|max:500',
            'title' => 'nullable|string|max:255',
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Please select a file to upload.',
            'file.max' => 'File size cannot exceed 10MB.',
            'folder_id.exists' => 'Selected folder does not exist.',
        ];
    }

    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'File upload validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
