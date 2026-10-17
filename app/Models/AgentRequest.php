<?php

// namespace App\Models;

// use Illuminate\Database\Eloquent\Factories\HasFactory;
// use Illuminate\Database\Eloquent\Model;

// class AgentRequest extends Model
// {
//     use HasFactory;

//     protected $fillable = [
//         'user_id',
//         'assessment_year',
//         'status',
//         'pipeline_status',
//         'onboarding_complete',
//         'itr_portal_registered',
//         'payment_status',
//         'payment_id',
//         'paid_at',
//         'customer_change_request',
//         'submitted_by_role',
//         'submitted_at',
//         'acknowledgement_number',
//         'service_type',
//         'notes',
//         'details',
//         'assigned_employee_id',
//         'uploaded_file_path',
//         'file_name',
//         'completed_at',
//         'customer_approved_at',
//     ];

//     protected $casts = [
//         'details'              => 'array',
//         'onboarding_complete'  => 'boolean',
//         'itr_portal_registered'=> 'boolean',
//         'paid_at'              => 'datetime',
//         'submitted_at'         => 'datetime',
//         'completed_at'         => 'datetime',
//         'customer_approved_at' => 'datetime',
//     ];

//     public function user()
//     {
//         return $this->belongsTo(User::class);
//     }

//     public function assignedEmployee()
//     {
//         return $this->belongsTo(User::class, 'assigned_employee_id');
//     }

//     public function chatMessages()
//     {
//         return $this->hasMany(ChatMessage::class)->orderBy('created_at', 'asc');
//     }

//     public function statusHistory()
//     {
//         return $this->hasMany(AgentRequestStatusHistory::class)->orderBy('created_at', 'desc');
//     }

//     public function missingDocRequests()
//     {
//         return $this->hasMany(AgentMissingDocRequest::class)->orderBy('created_at', 'desc');
//     }

//     public function taxSnapshots()
//     {
//         return $this->hasMany(AgentTaxDataSnapshot::class)->latest('fetched_at');
//     }

//     public function dataMismatches()
//     {
//         return $this->hasMany(AgentDataMismatch::class);
//     }

//     public function regimeResults()
//     {
//         return $this->hasOne(AgentRegimeResult::class)->latestOfMany();
//     }
// }





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
        'pipeline_status',
        'onboarding_complete',
        'itr_portal_registered',
        'payment_status',
        'payment_id',
        'paid_at',
        'customer_change_request',
        'submitted_by_role',
        'submitted_at',
        'acknowledgement_number',
        'service_type',
        'notes',
        'details',
        'assigned_employee_id',
        'uploaded_file_path',
        'file_name',
        'completed_at',
        'customer_approved_at',
        'customer_approved',
        'quality_gate_passed',
        'reviewer_id',
        'chosen_regime',
        'itr_form_type',
        'tax_summary',
    ];

    protected $casts = [
        'details'              => 'array',
        'onboarding_complete'  => 'boolean',
        'itr_portal_registered'=> 'boolean',
        'paid_at'              => 'datetime',
        'submitted_at'         => 'datetime',
        'completed_at'         => 'datetime',
        'customer_approved_at' => 'datetime',
        'customer_approved'    => 'boolean',
        'quality_gate_passed'  => 'boolean',
        'tax_summary'          => 'array',
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

    public function statusHistory()
    {
        return $this->hasMany(AgentRequestStatusHistory::class)->orderBy('created_at', 'desc');
    }

    public function missingDocRequests()
    {
        return $this->hasMany(AgentMissingDocRequest::class)->orderBy('created_at', 'desc');
    }

    public function taxSnapshots()
    {
        return $this->hasMany(AgentTaxDataSnapshot::class)->latest('fetched_at');
    }

    public function dataMismatches()
    {
        return $this->hasMany(AgentDataMismatch::class);
    }

    public function regimeResults()
    {
        return $this->hasOne(AgentRegimeResult::class)->latestOfMany();
    }
}