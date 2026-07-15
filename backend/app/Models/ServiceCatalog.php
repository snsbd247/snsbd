<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceCatalog extends Model
{
    protected $table = 'service_catalog';
    protected $fillable = ['name','category','description','price','billing_cycle','is_active','sort_order'];
    protected $casts = ['price' => 'decimal:2', 'is_active' => 'bool'];
}
