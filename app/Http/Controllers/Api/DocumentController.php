<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\DocumentUploadRequest;
use App\Models\Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->documents()
                ->when($request->assessment_year, fn ($q) => $q->where('assessment_year', $request->assessment_year))
                ->latest()
                ->get()
        );
    }

    public function store(DocumentUploadRequest $request)
    {
        $validated = $request->validated();
        $file = $validated['file'];

        // Extra safety: verify actual file content matches an allowed MIME,
        // not just the extension (prevents disguised executable uploads).
        $realMime = $file->getMimeType();
        $allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
        if (! in_array($realMime, $allowedMimes, true)) {
            return response()->json(['message' => 'File content does not match an allowed document type.'], 422);
        }

        $checksum = hash_file('sha256', $file->getRealPath());

        // Store outside the public web root; served later via an
        // authenticated, ownership-checked download endpoint only.
        $storedPath = $file->store(
            "documents/{$request->user()->id}/{$validated['assessment_year']}",
            'local'
        );

        $document = Document::create([
            'user_id' => $request->user()->id,
            'assessment_year' => $validated['assessment_year'],
            'type' => $validated['type'],
            'original_filename' => $file->getClientOriginalName(),
            'stored_path' => $storedPath,
            'mime_type' => $realMime,
            'size_bytes' => $file->getSize(),
            'checksum_sha256' => $checksum,
            'status' => 'uploaded', // a real system would enqueue AV scanning here before 'clean'
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'document' => $document,
        ], 201);
    }

    public function destroy(Request $request, Document $document)
    {
        abort_unless($document->user_id === $request->user()->id, 403);

        Storage::disk('local')->delete($document->stored_path);
        $document->delete();

        return response()->json(['message' => 'Document deleted.']);
    }

    public function download(Request $request, Document $document)
    {
        abort_unless($document->user_id === $request->user()->id, 403);

        if (! Storage::disk('local')->exists($document->stored_path)) {
            abort(404);
        }

        return Storage::disk('local')->download($document->stored_path, $document->original_filename);
    }
}
