<?php

namespace App\Services\TaxData;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class HttpTaxDataProvider implements TaxDataProviderInterface
{
    protected string $baseUrl;
    protected string $apiKey;
    protected int $timeout;

    public function __construct(?string $baseUrl = null, ?string $apiKey = null, ?int $timeout = null)
    {
        $this->baseUrl = rtrim($baseUrl ?? config('services.tax_data.base_url', 'https://api.taxprovider.in/v1'), '/');
        $this->apiKey = $apiKey ?? config('services.tax_data.api_key', '');
        $this->timeout = $timeout ?? (int) config('services.tax_data.timeout', 15);
    }

    public function fetchAis(string $pan, string $assessmentYear): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Accept' => 'application/json',
            ])->timeout($this->timeout)->post("{$this->baseUrl}/taxpayer/ais", [
                'pan' => strtoupper($pan),
                'assessment_year' => $assessmentYear,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('Tax Data API AIS fetch failed', [
                'status' => $response->status(),
                'pan_prefix' => substr($pan, 0, 5),
            ]);

            throw new \RuntimeException('Failed to fetch AIS data from external provider. Code: ' . $response->status());
        } catch (\Throwable $e) {
            Log::error('Tax Data API HTTP Exception: ' . $e->getMessage());
            throw $e;
        }
    }

    public function fetch26as(string $pan, string $assessmentYear): array
    {
        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->apiKey}",
                'Accept' => 'application/json',
            ])->timeout($this->timeout)->post("{$this->baseUrl}/taxpayer/form26as", [
                'pan' => strtoupper($pan),
                'assessment_year' => $assessmentYear,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            Log::warning('Tax Data API 26AS fetch failed', [
                'status' => $response->status(),
                'pan_prefix' => substr($pan, 0, 5),
            ]);

            throw new \RuntimeException('Failed to fetch Form 26AS data from external provider. Code: ' . $response->status());
        } catch (\Throwable $e) {
            Log::error('Tax Data API HTTP Exception: ' . $e->getMessage());
            throw $e;
        }
    }
}
