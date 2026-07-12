<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DomainPricing extends Model
{
    protected $table = 'domain_pricing';
    protected $guarded = ['id'];
    protected $casts = [
        'is_active' => 'bool', 'featured' => 'bool',
        'register_price' => 'decimal:2', 'renew_price' => 'decimal:2', 'transfer_price' => 'decimal:2',
    ];
}
