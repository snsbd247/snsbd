<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['cpanel_password'];
    protected $casts = [
        'purchase_date' => 'date', 'expiry_date' => 'date',
        'renewable' => 'bool', 'cost_price' => 'decimal:2', 'sale_price' => 'decimal:2',
        'last_renewal_invoice_at' => 'datetime',
    ];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function project() { return $this->belongsTo(Project::class); }
    public function hostingPackage() { return $this->belongsTo(HostingPackage::class); }
    public function whmServer() { return $this->belongsTo(WhmServer::class); }
}
