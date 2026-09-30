<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Form16Request;
use App\Models\Form16Entry;
use Illuminate\Http\Request;

class Form16Controller extends Controller
{
    public function index(Request $request)
    {
        return response()->json(
            $request->user()->form16Entries()
                ->when($request->assessment_year, fn ($q) => $q->where('assessment_year', $request->assessment_year))
                ->get()
        );
    }

    /**
     * Manual entry path — used when the user doesn't have a Form 16 to upload.
     */
    public function store(Form16Request $request)
    {
        $validated = $request->validated();
        $validated['user_id'] = $request->user()->id;
        $validated['source'] = 'manual';

        // Cross-field sanity check: TDS shouldn't exceed gross salary.
        if (($validated['total_tds'] ?? 0) > $validated['gross_salary']) {
            return response()->json([
                'errors' => ['total_tds' => ['Total TDS cannot exceed gross salary.']],
            ], 422);
        }

        $entry = Form16Entry::create($validated);

        return response()->json([
            'message' => 'Form 16 details saved.',
            'entry' => $entry,
        ], 201);
    }

    public function update(Form16Request $request, Form16Entry $entry)
    {
        abort_unless($entry->user_id === $request->user()->id, 403);

        $validated = $request->validated();
        if (($validated['total_tds'] ?? 0) > $validated['gross_salary']) {
            return response()->json([
                'errors' => ['total_tds' => ['Total TDS cannot exceed gross salary.']],
            ], 422);
        }

        $entry->update($validated);

        return response()->json(['message' => 'Form 16 details updated.', 'entry' => $entry]);
    }

    public function destroy(Request $request, Form16Entry $entry)
    {
        abort_unless($entry->user_id === $request->user()->id, 403);
        $entry->delete();

        return response()->json(['message' => 'Entry removed.']);
    }
}
