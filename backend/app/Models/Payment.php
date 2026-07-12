<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];
    protected $casts = ['paid_at' => 'date', 'amount' => 'decimal:2', 'created_at' => 'datetime'];

    public function invoice() { return $this->belongsTo(Invoice::class); }
}
