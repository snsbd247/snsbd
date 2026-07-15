<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'customer_id', 'invoice_number', 'issue_date', 'due_date',
        'subtotal', 'tax', 'discount', 'total', 'amount_paid',
        'status', 'currency_code', 'template_key', 'theme_override',
        'notes', 'terms', 'coupon_id', 'paid_at',
    ];
    protected $casts = [
        'issue_date'     => 'date',
        'due_date'       => 'date',
        'paid_at'        => 'datetime',
        'theme_override' => 'array',
        'subtotal'    => 'decimal:2',
        'tax'         => 'decimal:2',
        'discount'    => 'decimal:2',
        'total'       => 'decimal:2',
        'amount_paid' => 'decimal:2',
    ];

    public function customer(): BelongsTo   { return $this->belongsTo(User::class, 'customer_id'); }
    public function items(): HasMany        { return $this->hasMany(InvoiceItem::class); }
    public function payments(): HasMany     { return $this->hasMany(Payment::class); }
    public function currency(): BelongsTo   { return $this->belongsTo(Currency::class, 'currency_code', 'code'); }
    public function coupon(): BelongsTo     { return $this->belongsTo(Coupon::class); }
}
