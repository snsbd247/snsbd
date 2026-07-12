<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceCatalog extends Model
{
    protected $table = 'service_catalog';
    protected $guarded = ['id'];
    protected $casts = ['is_active' => 'bool', 'price' => 'decimal:2'];
}
