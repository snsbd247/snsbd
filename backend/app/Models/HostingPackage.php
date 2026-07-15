<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HostingPackage extends Model
{
    protected $fillable = [
        'name','description','category','tagline','disk_space','bandwidth',
        'features','price','billing_cycle','is_active','featured','badge',
        'whm_package_name','sort_order',
    ];
    protected $casts = [
        'features'  => 'array',
        'price'     => 'decimal:2',
        'is_active' => 'bool',
        'featured'  => 'bool',
    ];
}
