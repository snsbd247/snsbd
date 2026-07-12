<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['amount' => 'decimal:2', 'raw_response' => 'array'];
}
