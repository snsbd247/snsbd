<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InvoiceTemplate extends Model
{
    protected $fillable = [
        'template_key', 'name', 'description', 'theme',
        'is_default', 'is_active', 'sort_order',
    ];
    protected $casts = [
        'theme'      => 'array',
        'is_default' => 'bool',
        'is_active'  => 'bool',
    ];
}
