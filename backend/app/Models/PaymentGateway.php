<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentGateway extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['app_secret', 'password'];
    protected $casts = ['is_active' => 'bool', 'extra' => 'array'];
}
