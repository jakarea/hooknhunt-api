<?php

namespace App\Http\Requests\Media;

use App\Http\Requests\ApiRequest;

class UploadFileRequest extends ApiRequest
{
    public function rules(): array
    {
        return [
            // এখন 'files' নামে অ্যারে এক্সেপ্ট করবে
            'files' => 'required|array',
            'files.*' => 'file|max:10240|mimes:jpeg,png,jpg,gif,svg,webp,pdf,doc,docx,xls,xlsx',
            'folder_id' => 'nullable|integer|exists:media_folders,id'
        ];
    }

    public function messages()
    {
        return [
            'files.required' => 'Please select at least one file.',
            'files.array' => 'Files must be uploaded as an array (key: files[]).',
            'files.*.max' => 'Each file must not exceed 10MB.',
            'files.*.mimes' => 'Only images and documents are allowed.'
        ];
    }
    
    // Optional: Prepare input for backward compatibility (if client sends 'file')
    protected function prepareForValidation()
    {
        if ($this->hasFile('file')) {
            $this->merge(['files' => [$this->file('file')]]);
        }
    }
}