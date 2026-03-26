<?php

namespace App\Http\Controllers\Api\V2;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\MediaFile;
use App\Models\MediaFolder;
use App\Traits\ApiResponse;
use Illuminate\Support\Facades\Storage;
use App\Http\Requests\Media\UploadFileRequest; // Import Request
use Illuminate\Support\Str;

class MediaController extends Controller
{
    use ApiResponse;

    /**
     * 1. Get Folders (filtered by user's view permission)
     */
    public function getFolders()
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.view')) {
            return $this->sendError('You do not have permission to view media library.', null, 403);
        }

        $user = auth()->user();
        $folders = MediaFolder::withCount('mediaFiles')
            ->get()
            ->filter(function ($folder) use ($user) {
                return $folder->canBeViewedBy($user);
            });

        return $this->sendSuccess($folders);
    }

    /**
     * 2. Create New Folder
     */
    public function createFolder(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.folders.create')) {
            return $this->sendError('You do not have permission to create folders.', null, 403);
        }

        $request->validate([
            'name' => 'required|string|max:50',
            'view_roles' => 'nullable|array',
            'view_roles.*' => 'string',
            'edit_roles' => 'nullable|array',
            'edit_roles.*' => 'string',
        ]);

        $folder = MediaFolder::create([
            'name' => $request->name,
            'slug' => Str::slug($request->name) . '-' . time(),
            'parent_id' => $request->parent_id ?? null,
            'view_roles' => $request->view_roles ?? [],
            'edit_roles' => $request->edit_roles ?? [],
        ]);

        return $this->sendSuccess($folder, 'Folder created successfully');
    }

    /**
     * 2.1 Update/Rename Folder
     */
    public function updateFolder(Request $request, $id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.folders.edit')) {
            return $this->sendError('You do not have permission to edit folders.', null, 403);
        }

        $request->validate([
            'name' => 'required|string|max:50',
            'view_roles' => 'nullable|array',
            'view_roles.*' => 'string',
            'edit_roles' => 'nullable|array',
            'edit_roles.*' => 'string',
        ]);

        $folder = MediaFolder::findOrFail($id);

        // Check folder-level edit permission
        if (!$folder->canBeEditedBy(auth()->user())) {
            return $this->sendError('Unauthorized', ['message' => 'You do not have permission to edit this folder'], 403);
        }

        $folder->update([
            'name' => $request->name,
            'slug' => Str::slug($request->name) . '-' . time(),
            'view_roles' => $request->view_roles ?? $folder->view_roles,
            'edit_roles' => $request->edit_roles ?? $folder->edit_roles,
        ]);

        return $this->sendSuccess($folder, 'Folder updated successfully');
    }

    /**
     * 3. Get Files (With Filter & Pagination)
     */
    public function getFiles(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.view')) {
            return $this->sendError('You do not have permission to view media files.', null, 403);
        }

        $query = MediaFile::latest();

        // Filter by Folder
        if ($request->has('folder_id') && $request->folder_id !== null) {
            $query->where('folder_id', $request->folder_id);
        } elseif ($request->missing('folder_id')) {
            // When no folder_id is specified, only show files not in any folder
            $query->whereNull('folder_id');
        }

        // Filter by Type (image, pdf)
        if ($request->type) {
            $query->where('mime_type', 'like', '%' . $request->type . '%');
        }

        $files = $query->paginate(20);
        return $this->sendSuccess($files);
    }

    /**
     * 4. Upload File (The Main Logic)
     */

    public function upload(UploadFileRequest $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.files.upload')) {
            return $this->sendError('You do not have permission to upload files.', null, 403);
        }

        $uploadedFiles = [];
        $files = $request->file('files'); // Get Array of files

        // যদি কেউ ভুল করে Single 'file' পাঠায়, সেটাকেও অ্যারে বানিয়ে নেব
        if ($request->hasFile('file')) {
            $files = [$request->file('file')];
        }

        try {
            foreach ($files as $file) {
                // 1. Generate Unique Name
                $originalName = $file->getClientOriginalName();
                $filename = time() . '_' . uniqid() . '_' . preg_replace('/\s+/', '-', $originalName);

                // 2. Store File
                $path = $file->storeAs('uploads', $filename, 'public');

                // 3. Get Image Dimensions (Optional, only if it's an image)
                $width = null;
                $height = null;
                if (str_starts_with($file->getClientMimeType(), 'image/')) {
                    $dimensions = @getimagesize($file->getRealPath());
                    $width = $dimensions[0] ?? null;
                    $height = $dimensions[1] ?? null;
                }

                // 4. Create DB Record
                $media = MediaFile::create([
                    'folder_id' => $request->folder_id,
                    'filename' => $filename,
                    'original_filename' => $originalName,
                    'path' => $path,
                    'url' => asset('storage/' . $path),
                    'mime_type' => $file->getClientMimeType(),
                    'size' => $file->getSize(),
                    'disk' => 'public',
                    'uploaded_by_user_id' => auth()->id() ?? null,
                    'width' => $width,
                    'height' => $height,
                ]);

                $uploadedFiles[] = $media;
            }

            return $this->sendSuccess($uploadedFiles, count($uploadedFiles) . ' files uploaded successfully', 201);

        } catch (\Exception $e) {
            return $this->sendError('Upload failed', ['error' => $e->getMessage()], 500);
        }
    }

    /**
     * 5. Bulk Delete Files
     */
    public function bulkDelete(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.files.delete')) {
            return $this->sendError('You do not have permission to delete files.', null, 403);
        }

        $request->validate(['ids' => 'required|array']);

        $files = MediaFile::whereIn('id', $request->ids)->get();

        foreach ($files as $file) {
            // Delete from storage
            if (Storage::disk('public')->exists($file->path)) {
                Storage::disk('public')->delete($file->path);
            }
            // Delete from DB
            $file->delete();
        }

        return $this->sendSuccess(null, 'Selected files deleted successfully');
    }

    /**
     * 5.1 Bulk Move Files to Folder
     */
    public function bulkMoveFiles(Request $request)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.files.move')) {
            return $this->sendError('You do not have permission to move files.', null, 403);
        }

        $request->validate([
            'ids' => 'required|array',
            'folder_id' => 'nullable|exists:media_folders,id',
        ]);

        // Check if user has permission to add files to the target folder
        if ($request->folder_id) {
            $targetFolder = MediaFolder::find($request->folder_id);
            if ($targetFolder && !$targetFolder->canBeEditedBy(auth()->user())) {
                return $this->sendError('Unauthorized', ['message' => 'You do not have permission to move files to this folder'], 403);
            }
        }

        $files = MediaFile::whereIn('id', $request->ids)->get();

        foreach ($files as $file) {
            $file->update(['folder_id' => $request->folder_id]);
        }

        return $this->sendSuccess($files, $files->count() . ' files moved successfully');
    }

    /**
     * 6. Delete Folder
     */
    public function deleteFolder($id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.folders.delete')) {
            return $this->sendError('You do not have permission to delete folders.', null, 403);
        }

        $folder = MediaFolder::findOrFail($id);

        // Check folder-level edit permission
        if (!$folder->canBeEditedBy(auth()->user())) {
            return $this->sendError('Unauthorized', ['message' => 'You do not have permission to delete this folder'], 403);
        }

        // Check if folder has files
        $filesCount = $folder->mediaFiles()->count();

        // Check if folder has subfolders
        $subfoldersCount = MediaFolder::where('parent_id', $id)->count();

        if ($filesCount > 0 || $subfoldersCount > 0) {
            return $this->sendError(
                'Cannot delete folder',
                [
                    'message' => 'Folder is not empty. Please delete all files and subfolders first.',
                    'files_count' => $filesCount,
                    'subfolders_count' => $subfoldersCount
                ],
                400
            );
        }

        $folder->delete();

        return $this->sendSuccess(null, 'Folder deleted successfully');
    }

    /**
     * 7. Update File (Move to folder, Rename, Alt Text)
     */
    public function updateFile(Request $request, $id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.files.edit')) {
            return $this->sendError('You do not have permission to edit files.', null, 403);
        }

        $file = MediaFile::findOrFail($id);

        $validated = $request->validate([
            'folder_id' => 'nullable|exists:media_folders,id',
            'alt_text' => 'nullable|string|max:255',
            'filename' => 'nullable|string|max:255',
        ]);

        $file->update($validated);

        return $this->sendSuccess($file, 'File updated successfully');
    }

    /**
     * 8. Get Single File
     */
    public function getFile($id)
    {
        // Permission check
        if (!auth()->user()->hasPermissionTo('cms.media.view')) {
            return $this->sendError('You do not have permission to view media files.', null, 403);
        }

        $file = MediaFile::with('folder')->findOrFail($id);
        return $this->sendSuccess($file);
    }
}