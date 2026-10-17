<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AgentRegimeResult extends Model
{
    use HasFactory;

    protected $table = 'agent_regime_results';

    protected $fillable = [
        'agent_request_id',
        'gross_income',
        'deductions_old',
        'deductions_new',
        'tax_old_regime',
        'tax_new_regime',
        'recommended_regime',
        'final_regime',
        'savings',
        'computation_sheet',
        'prepared_by_user_id',
    ];

    protected $casts = [
        'gross_income' => 'decimal:2',
        'tax_old_regime' => 'decimal:2',
        'tax_new_regime' => 'decimal:2',
        'savings' => 'decimal:2',
        'deductions_old' => 'array',
        'deductions_new' => 'array',
        'computation_sheet' => 'array',
    ];

    public function agentRequest()
    {
        return $this->belongsTo(AgentRequest::class);
    }

    public function preparedByUser()
    {
        return $this->belongsTo(User::class, 'prepared_by_user_id');
    }
}
