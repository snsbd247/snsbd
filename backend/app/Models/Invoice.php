<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'issue_date' => 'date', 'due_date' => 'date',
        'subtotal' => 'decimal:2', 'tax' => 'decimal:2', 'total' => 'decimal:2',
        'amount_paid' => 'decimal:2', 'late_fee' => 'decimal:2',
        'late_fee_applied_at' => 'datetime',
    ];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function items() { return $this->hasMany(InvoiceItem::class); }
    public function payments() { return $this->hasMany(Payment::class); }
    public function project() { return $this->belongsTo(Project::class); }
}
