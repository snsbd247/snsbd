<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TeamMember extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['active' => 'bool', 'joined_at' => 'date', 'monthly_salary' => 'decimal:2'];

    public function salaryPayments() { return $this->hasMany(SalaryPayment::class); }
}
