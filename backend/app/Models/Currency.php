<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Currency extends Model
{
    protected $primaryKey = 'code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['code', 'name', 'symbol', 'rate_to_bdt', 'is_active'];
    protected $casts = ['rate_to_bdt' => 'decimal:4', 'is_active' => 'bool'];
}
