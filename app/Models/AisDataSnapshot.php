<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AisDataSnapshot extends Model
{
    protected $fillable = [
        'ais_connection_id', 'user_id', 'assessment_year',
        'salary_data', 'tds_data', 'interest_income_data',
        'other_income_data', 'sft_data', 'raw_response', 'fetched_at',
    ];

    protected function casts(): array
    {
        return [
            'salary_data' => 'array',
            'tds_data' => 'array',
            'interest_income_data' => 'array',
            'other_income_data' => 'array',
            'sft_data' => 'array',
            'raw_response' => 'array',
            'fetched_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function connection()
    {
        return $this->belongsTo(AisConnection::class, 'ais_connection_id');
    }
}
