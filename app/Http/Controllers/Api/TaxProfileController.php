<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TaxProfileRequest;
use App\Models\TaxProfile;

class TaxProfileController extends Controller
{
    public function show(TaxProfileRequest $request)
    {
        return response()->json($request->user()->taxProfile);
    }

    public function upsert(TaxProfileRequest $request)
    {
        $validated = $request->validated();
        $validated['pan'] = strtoupper($validated['pan']);

        $profile = TaxProfile::updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        );

        return response()->json([
            'message' => 'Tax profile saved.',
            'profile' => $profile,
        ]);
    }
}
