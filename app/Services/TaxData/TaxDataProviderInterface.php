<?php

namespace App\Services\TaxData;

interface TaxDataProviderInterface
{
    /**
     * Fetch AIS (Annual Information Statement) data for a given PAN & AY.
     *
     * @param string $pan
     * @param string $assessmentYear
     * @return array
     */
    public function fetchAis(string $pan, string $assessmentYear): array;

    /**
     * Fetch Form 26AS (Tax Credit Statement) data for a given PAN & AY.
     *
     * @param string $pan
     * @param string $assessmentYear
     * @return array
     */
    public function fetch26as(string $pan, string $assessmentYear): array;
}
