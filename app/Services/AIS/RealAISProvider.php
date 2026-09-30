<?php

namespace App\Services\AIS;

use Illuminate\Support\Facades\Http;

/**
 * Real implementation, wired to a licensed ERI partner's API
 * (e.g. Quicko, Protean/NSDL, Karza) once you have a contract + credentials.
 *
 * IMPORTANT: This class must NEVER accept or forward a taxpayer's government
 * portal password. All auth happens on the government/partner's own
 * consent screen; you only ever handle opaque tokens returned to you.
 *
 * Fill in the TODOs with your partner's actual documented endpoints.
 */
class RealAISProvider implements AISProviderInterface
{
    private string $baseUrl;
    private string $apiKey;
    private string $clientId;

    public function __construct()
    {
        $this->baseUrl = config('services.ais.base_url');
        $this->apiKey = config('services.ais.api_key');
        $this->clientId = config('services.ais.client_id');
    }

    public function initiateConnection(string $pan, string $assessmentYear): array
    {
        // TODO: replace with your ERI partner's actual "initiate consent" endpoint.
        $response = Http::withToken($this->apiKey)
            ->post("{$this->baseUrl}/v1/consent/initiate", [
                'client_id' => $this->clientId,
                'pan' => $pan,
                'assessment_year' => $assessmentYear,
                'redirect_uri' => config('app.url').'/api/ais/callback',
            ])
            ->throw()
            ->json();

        return [
            'redirect_url' => $response['consent_url'],
            'reference' => $response['reference_id'],
        ];
    }

    public function checkConnectionStatus(string $reference): array
    {
        // TODO: replace with your ERI partner's actual status-check endpoint.
        $response = Http::withToken($this->apiKey)
            ->get("{$this->baseUrl}/v1/consent/status/{$reference}")
            ->throw()
            ->json();

        return [
            'status' => $response['status'],
            'connection_token' => $response['access_token'] ?? null,
        ];
    }

    public function fetchAIS(string $connectionToken, string $assessmentYear): array
    {
        // TODO: replace with your ERI partner's actual AIS endpoint.
        return Http::withToken($connectionToken)
            ->get("{$this->baseUrl}/v1/ais", ['assessment_year' => $assessmentYear])
            ->throw()
            ->json();
    }

    public function fetch26AS(string $connectionToken, string $assessmentYear): array
    {
        // TODO: replace with your ERI partner's actual 26AS endpoint.
        return Http::withToken($connectionToken)
            ->get("{$this->baseUrl}/v1/form26as", ['assessment_year' => $assessmentYear])
            ->throw()
            ->json();
    }

    public function fetchPrefill(string $connectionToken, string $assessmentYear): array
    {
        // TODO: replace with your ERI partner's actual prefill endpoint.
        return Http::withToken($connectionToken)
            ->get("{$this->baseUrl}/v1/prefill", ['assessment_year' => $assessmentYear])
            ->throw()
            ->json();
    }
}
