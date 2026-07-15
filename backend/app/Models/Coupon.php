<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code', 'description', 'discount_percent', 'discount_amount',
        'max_uses', 'used_count', 'expires_at', 'is_active',
    ];
    protected $casts = [
        'discount_percent' => 'decimal:2',
        'discount_amount'  => 'decimal:2',
        'expires_at'       => 'datetime',
        'is_active'        => 'bool',
    ];
}
