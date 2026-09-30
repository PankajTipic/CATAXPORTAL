<?php

namespace App\Services\AIS;

interface AISProviderInterface
{
    /**
     * Start a consent-based connection flow for a user.
     * Returns an array with a redirect_url (or embed config) the frontend
     * sends the user to, PLUS a provider-side reference id to poll/verify.
     * At no point does this method accept a government-portal password.
     *
     * @param  string  $pan
     * @param  string  $assessmentYear
     * @return array{redirect_url: string, reference: string}
     */
    public function initiateConnection(string $pan, string $assessmentYear): array;

    /**
     * Check the status of a previously initiated connection.
     *
     * @return array{status: string, connection_token: ?string}
     */
    public function checkConnectionStatus(string $reference): array;

    /**
     * Fetch AIS (Annual Information Statement) data using an established
     * connection token (never a password).
     */
    public function fetchAIS(string $connectionToken, string $assessmentYear): array;

    /**
     * Fetch Form 26AS data using an established connection token.
     */
    public function fetch26AS(string $connectionToken, string $assessmentYear): array;

    /**
     * Fetch prefill data (salary, TDS, bank interest summary) if the
     * provider supports it.
     */
    public function fetchPrefill(string $connectionToken, string $assessmentYear): array;
}
