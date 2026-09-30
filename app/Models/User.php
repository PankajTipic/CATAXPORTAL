<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = ['name', 'email', 'phone', 'password', 'role'];

    protected $hidden = ['password', 'remember_token'];

    protected $appends = ['pan'];

    public function getPanAttribute(): ?string
    {
        return $this->taxProfile?->pan;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isEmployee(): bool
    {
        return $this->role === 'employee';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer' || empty($this->role);
    }

    public function agentRequests()
    {
        return $this->hasMany(AgentRequest::class);
    }

    public function assignedAgentRequests()
    {
        return $this->hasMany(AgentRequest::class, 'assigned_employee_id');
    }

    public function taxProfile()
    {
        return $this->hasOne(TaxProfile::class);
    }

    public function aisConnections()
    {
        return $this->hasMany(AisConnection::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function form16Entries()
    {
        return $this->hasMany(Form16Entry::class);
    }

    public function itrFilings()
    {
        return $this->hasMany(ItrFiling::class);
    }
}
