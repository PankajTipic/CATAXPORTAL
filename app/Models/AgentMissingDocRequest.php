<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentMissingDocRequest extends Model
{
    use HasFactory;

    protected $table = 'agent_missing_doc_requests';

    protected $fillable = [
        'agent_request_id',
        'requested_by_user_id',
        'checklist',
        'notes',
        'status',
        'resolved_at',
    ];

    protected $casts = [
        'checklist' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function agentRequest()
    {
        return $this->belongsTo(AgentRequest::class);
    }

    public function requestedByUser()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }
}
