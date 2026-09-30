<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AisConnection;
use App\Models\AisDataSnapshot;
use App\Services\AIS\AISProviderFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AisConnectionController extends Controller
{
    /**
     * Step 1: Start the consent flow. Frontend redirects the user to
     * `redirect_url`. We NEVER accept a govt-portal password here.
     */
    public function initiate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'assessment_year' => ['required', 'regex:/^[0-9]{4}-[0-9]{2}$/'],
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $profile = $user->taxProfile;

        if (! $profile) {
            return response()->json(['message' => 'Please complete your tax profile (PAN, DOB) before connecting.'], 422);
        }

        $provider = AISProviderFactory::make();
        $result = $provider->initiateConnection($profile->pan, $request->assessment_year);

        $connection = AisConnection::create([
            'user_id' => $user->id,
            'provider' => config('services.ais.provider', 'mock'),
            'status' => 'pending',
            'connection_reference' => $result['reference'],
            'assessment_year' => $request->assessment_year,
        ]);

        return response()->json([
            'message' => 'Redirect the user to complete authentication on the official portal.',
            'redirect_url' => $result['redirect_url'],
            'connection_id' => $connection->id,
        ]);
    }

    /**
     * Step 2: Poll/confirm connection status after the user completes
     * authentication on the government/ERI-hosted page.
     */
    public function checkStatus(Request $request, AisConnection $connection)
    {
        $this->authorizeOwnership($request, $connection);

        $provider = AISProviderFactory::make();
        $result = $provider->checkConnectionStatus($connection->connection_reference);

        $connection->status = $result['status'];
        if ($result['status'] === 'connected') {
            $connection->connected_at = now();
            $connection->expires_at = now()->addHours(1); // short-lived, re-auth required after
            // connection_reference is replaced by the opaque access token for subsequent calls
            $connection->connection_reference = $result['connection_token'];
        }
        $connection->save();

        return response()->json($connection);
    }

    /**
     * Step 3: Once connected, pull AIS/26AS and cache a snapshot.
     */
    public function fetchData(Request $request, AisConnection $connection)
    {
        $this->authorizeOwnership($request, $connection);

        if ($connection->status !== 'connected') {
            return response()->json(['message' => 'Connection is not active. Please reconnect.'], 422);
        }

        $provider = AISProviderFactory::make();
        $ais = $provider->fetchAIS($connection->connection_reference, $connection->assessment_year);
        $form26as = $provider->fetch26AS($connection->connection_reference, $connection->assessment_year);

        $snapshot = AisDataSnapshot::updateOrCreate(
            ['user_id' => $request->user()->id, 'assessment_year' => $connection->assessment_year],
            [
                'ais_connection_id' => $connection->id,
                'salary_data' => $ais['salary_data'] ?? [],
                'tds_data' => $ais['tds_data'] ?? [],
                'interest_income_data' => $ais['interest_income_data'] ?? [],
                'other_income_data' => $ais['other_income_data'] ?? [],
                'sft_data' => $ais['sft_data'] ?? [],
                'raw_response' => ['ais' => $ais, 'form26as' => $form26as],
                'fetched_at' => now(),
            ]
        );

        return response()->json($snapshot);
    }

    private function authorizeOwnership(Request $request, AisConnection $connection): void
    {
        abort_unless($connection->user_id === $request->user()->id, 403, 'Not your connection.');
    }
}
