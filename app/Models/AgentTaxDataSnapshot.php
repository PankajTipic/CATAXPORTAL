<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentTaxDataSnapshot extends Model
{
    use HasFactory;

    protected $table = 'agent_tax_data_snapshots';

    protected $fillable = [
        'agent_request_id',
        'provider',
        'pan',
        'assessment_year',
        'ais_data',
        'form26as_data',
        'fetched_at',
        'status',
        'error_message',
    ];

    protected $casts = [
        'ais_data' => 'array',
        'form26as_data' => 'array',
        'fetched_at' => 'datetime',
    ];

    public function agentRequest()
    {
        return $this->belongsTo(AgentRequest::class);
    }

    public function mismatches()
    {
        return $this->hasMany(AgentDataMismatch::class, 'snapshot_id');
    }
}
