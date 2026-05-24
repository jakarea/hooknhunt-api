<?php

namespace App\Modules\CMS\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadFileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Authorization is handled in the controller via hasPermissionTo()
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'files' => 'nullable|array|max:10',
            'files.*' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt,zip|max:10240', // 10MB max
            'file' => 'nullable|file|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,txt,zip|max:10240', // 10MB max
            'folder_id' => 'nullable|integer|exists:media_folders,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'files.*.mimes' => 'The :attribute must be a file of type: jpg, jpeg, png, gif, webp, pdf, doc, docx, txt, zip.',
            'file.mimes' => 'The :attribute must be a file of type: jpg, jpeg, png, gif, webp, pdf, doc, docx, txt, zip.',
            'files.*.max' => 'The :attribute may not be greater than 10MB.',
            'file.max' => 'The :attribute may not be greater than 10MB.',
            'folder_id.exists' => 'The selected folder does not exist.',
        ];
    }
}
