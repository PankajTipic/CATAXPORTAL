<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItrFiling extends Model
{
    protected $fillable = [
        'user_id', 'assessment_year', 'itr_form_type', 'total_income',
        'total_tax_liability', 'total_tds_claimed', 'refund_or_payable',
        'status', 'acknowledgement_number', 'computation_summary', 'filed_at',
    ];

    protected function casts(): array
    {
        return [
            'computation_summary' => 'array',
            'filed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
