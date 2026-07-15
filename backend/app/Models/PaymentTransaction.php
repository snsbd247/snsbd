<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentTransaction extends Model
{
    protected $fillable = ['payment_id', 'provider_ref', 'kind', 'amount', 'currency_code', 'status', 'payload'];
    protected $casts = [
        'amount'  => 'decimal:2',
        'payload' => 'array',
    ];

    public function payment(): BelongsTo { return $this->belongsTo(Payment::class); }
}
