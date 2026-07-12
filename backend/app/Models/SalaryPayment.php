<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SalaryPayment extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['paid_at' => 'date', 'amount' => 'decimal:2'];

    public function teamMember() { return $this->belongsTo(TeamMember::class); }
}
