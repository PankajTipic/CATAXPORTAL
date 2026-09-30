<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxProfile extends Model
{
    protected $fillable = [
        'user_id', 'pan', 'date_of_birth', 'assessee_type',
        'address_line1', 'address_line2', 'city', 'state', 'pincode', 'aadhaar_last4',
    ];

    protected function casts(): array
    {
        return ['date_of_birth' => 'date'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
