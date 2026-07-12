<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerOrder extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['quoted_price' => 'decimal:2'];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function hostingPackage() { return $this->belongsTo(HostingPackage::class); }
    public function serviceCatalog() { return $this->belongsTo(ServiceCatalog::class); }
    public function whmServer() { return $this->belongsTo(WhmServer::class); }
    public function activatedService() { return $this->belongsTo(Service::class, 'activated_service_id'); }
}
