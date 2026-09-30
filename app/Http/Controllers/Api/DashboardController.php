<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AisDataSnapshot;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class DashboardController extends Controller
{
    public function summary(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment_year' => ['required', 'regex:/^[0-9]{4}-[0-9]{2}$/'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $year = $request->assessment_year;

        $snapshot = AisDataSnapshot::where('user_id', $user->id)
            ->where('assessment_year', $year)
            ->first();

        $form16Entries = $user->form16Entries()->where('assessment_year', $year)->get();
        $documents = $user->documents()->where('assessment_year', $year)->get();

        return response()->json([
            'user' => $user,
            'tax_profile' => $user->taxProfile,
            
            'ais_snapshot' => $snapshot,
            'form16_entries' => $form16Entries,
            'documents' => $documents,
            'summary' => [
                'total_gross_salary' => $form16Entries->sum('gross_salary'),
                'total_tds' => $form16Entries->sum('total_tds')
                    + collect($snapshot->tds_data ?? [])->sum('amount'),
                'total_interest_income' => collect($snapshot->interest_income_data ?? [])->sum('amount'),
            ],
        ]);
    }
}
