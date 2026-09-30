<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    protected $fillable = [
        'user_id', 'assessment_year', 'type', 'original_filename',
        'stored_path', 'mime_type', 'size_bytes', 'checksum_sha256',
        'status', 'parsed_data',
    ];

    protected function casts(): array
    {
        return ['parsed_data' => 'array'];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
