<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HostingPackage extends Model
{
    protected $guarded = ['id'];
    protected $casts = [
        'features' => 'array', 'is_active' => 'bool', 'featured' => 'bool',
        'price' => 'decimal:2',
    ];
}
