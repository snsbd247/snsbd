<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Payment extends Model
{
    protected $fillable = [
        'invoice_id', 'gateway_id', 'amount', 'currency_code',
        'status', 'reference', 'notes', 'paid_at',
    ];
    protected $casts = [
        'amount'  => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function invoice(): BelongsTo      { return $this->belongsTo(Invoice::class); }
    public function gateway(): BelongsTo      { return $this->belongsTo(PaymentGateway::class, 'gateway_id'); }
    public function transactions(): HasMany   { return $this->hasMany(PaymentTransaction::class); }
}
