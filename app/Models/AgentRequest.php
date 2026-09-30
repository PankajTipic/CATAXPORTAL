<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'assessment_year',
        'status',
        'service_type',
        'notes',
        'details',
        'assigned_employee_id',
        'uploaded_file_path',
        'file_name',
        'completed_at',
        'customer_approved_at',
    ];

    protected $casts = [
        'details'              => 'array',
        'completed_at'         => 'datetime',
        'customer_approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedEmployee()
    {
        return $this->belongsTo(User::class, 'assigned_employee_id');
    }

    public function chatMessages()
    {
        return $this->hasMany(ChatMessage::class)->orderBy('created_at', 'asc');
    }
}
