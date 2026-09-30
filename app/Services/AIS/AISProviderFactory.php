<?php

namespace App\Services\AIS;

class AISProviderFactory
{
    public static function make(): AISProviderInterface
    {
        return match (config('services.ais.provider', 'mock')) {
            'real' => new RealAISProvider(),
            default => new MockAISProvider(),
        };
    }
}
