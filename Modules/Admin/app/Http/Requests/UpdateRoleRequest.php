<?php

namespace App\Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Only users with role-management.edit permission can update roles
        return auth()->check() && auth()->user()->can('role-management.edit');
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        $roleId = $this->route('id');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('roles')->ignore($roleId)],
            'description' => 'nullable|string|max:1000',
            'position' => 'nullable|integer|min:1|max:999',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,slug',
        ];
    }

    /**
     * Get custom error messages for validation.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Role name is required.',
            'name.unique' => 'A role with this name already exists.',
            'name.max' => 'Role name cannot exceed 255 characters.',
            'description.max' => 'Description cannot exceed 1000 characters.',
            'position.integer' => 'Position must be a number.',
            'position.min' => 'Position must be at least 1.',
            'permissions.array' => 'Permissions must be an array.',
            'permissions.*.exists' => 'One or more selected permissions do not exist.',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'name' => 'role name',
            'description' => 'role description',
            'position' => 'role position',
            'permissions' => 'permissions',
        ];
    }

    /**
     * Handle a failed validation attempt.
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        throw new \Illuminate\Http\Exceptions\HttpResponseException(
            response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422)
        );
    }
}
