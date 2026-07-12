<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    public $timestamps = false;
    protected $guarded = ['id'];
    protected $casts = [
        'quantity' => 'decimal:2', 'unit_price' => 'decimal:2', 'total' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function invoice() { return $this->belongsTo(Invoice::class); }
}
