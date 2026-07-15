<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = [
        'customer_id','hosting_package_id','catalog_id','name','domain','whm_username',
        'type','status','price','billing_cycle','start_date','next_due_date',
        'termination_date','notes','meta',
    ];
    protected $casts = [
        'start_date'        => 'date',
        'next_due_date'     => 'date',
        'termination_date'  => 'date',
        'price'             => 'decimal:2',
        'meta'              => 'array',
    ];

    public function customer(): BelongsTo         { return $this->belongsTo(User::class, 'customer_id'); }
    public function hostingPackage(): BelongsTo   { return $this->belongsTo(HostingPackage::class); }
    public function catalog(): BelongsTo          { return $this->belongsTo(ServiceCatalog::class, 'catalog_id'); }
    public function addons(): HasMany             { return $this->hasMany(ServiceAddon::class); }
    public function events(): HasMany             { return $this->hasMany(ServiceEvent::class); }
    public function packageChanges(): HasMany     { return $this->hasMany(ServicePackageChange::class); }
}
