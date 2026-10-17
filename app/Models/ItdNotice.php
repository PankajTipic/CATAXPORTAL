<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItdNotice extends Model
{
    protected $fillable = [
        'user_id',
        'pan',
        'assessment_year',
        'notice_din',
        'section',
        'title',
        'description',
        'issue_date',
        'due_date',
        'issuing_authority',
        'demand_amount',
        'refund_adjusted',
        'status',
        'severity',
        'notice_file_path',
        'response_type',
        'response_remarks',
        'response_file_path',
        'response_ack_number',
        'responded_at',
        'assigned_ca_id',
        'ca_notes',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'responded_at' => 'datetime',
            'demand_amount' => 'decimal:2',
            'refund_adjusted' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function assignedCa()
    {
        return $this->belongsTo(User::class, 'assigned_ca_id');
    }
}
