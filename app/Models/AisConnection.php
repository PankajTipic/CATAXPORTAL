<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AisConnection extends Model
{
    protected $fillable = [
        'user_id', 'provider', 'status', 'connection_reference',
        'assessment_year', 'connected_at', 'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'connected_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function snapshot()
    {
        return $this->hasOne(AisDataSnapshot::class);
    }

    public function snapshots()
    {
        return $this->hasMany(AisDataSnapshot::class);
    }
}
