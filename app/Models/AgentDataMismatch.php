<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentDataMismatch extends Model
{
    use HasFactory;

    protected $table = 'agent_data_mismatches';

    protected $fillable = [
        'agent_request_id',
        'snapshot_id',
        'category',
        'item_name',
        'ais_amount',
        'form26as_amount',
        'customer_doc_amount',
        'resolution',
        'resolution_notes',
        'resolved_by_user_id',
        'resolved_at',
    ];

    protected $casts = [
        'ais_amount' => 'decimal:2',
        'form26as_amount' => 'decimal:2',
        'customer_doc_amount' => 'decimal:2',
        'resolved_at' => 'datetime',
    ];

    public function agentRequest()
    {
        return $this->belongsTo(AgentRequest::class);
    }

    public function snapshot()
    {
        return $this->belongsTo(AgentTaxDataSnapshot::class, 'snapshot_id');
    }

    public function resolvedByUser()
    {
        return $this->belongsTo(User::class, 'resolved_by_user_id');
    }
}
