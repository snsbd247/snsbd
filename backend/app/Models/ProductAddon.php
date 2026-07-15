<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductAddon extends Model
{
    protected $fillable = ['name','description','price','billing_cycle','hosting_package_id','is_active'];
    protected $casts = ['price' => 'decimal:2', 'is_active' => 'bool'];

    public function hostingPackage(): BelongsTo { return $this->belongsTo(HostingPackage::class); }
}
