<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentGateway extends Model
{
    protected $fillable = ['code', 'name', 'provider', 'is_active', 'is_test_mode', 'config', 'sort_order'];
    protected $casts = [
        'is_active'    => 'bool',
        'is_test_mode' => 'bool',
        'config'       => 'array',
    ];

    public function payments(): HasMany { return $this->hasMany(Payment::class, 'gateway_id'); }
}
