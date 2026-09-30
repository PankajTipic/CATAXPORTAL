<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Form16Entry extends Model
{
    protected $fillable = [
        'user_id', 'document_id', 'assessment_year', 'employer_name', 'employer_tan',
        'gross_salary', 'standard_deduction', 'hra_exemption', 'professional_tax',
        'total_tds', 'deduction_80c', 'deduction_80d', 'source',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function document()
    {
        return $this->belongsTo(Document::class);
    }
}
