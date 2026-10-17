<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentRequestStatusHistory extends Model
{
    use HasFactory;

    protected $table = 'agent_request_status_history';

    public $timestamps = false;

    protected $fillable = [
        'agent_request_id',
        'from_status',
        'to_status',
        'changed_by_user_id',
        'changed_by_role',
        'notes',
        'metadata',
        'created_at',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function agentRequest()
    {
        return $this->belongsTo(AgentRequest::class);
    }

    public function changedByUser()
    {
        return $this->belongsTo(User::class, 'changed_by_user_id');
    }
}
