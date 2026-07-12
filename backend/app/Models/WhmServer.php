<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WhmServer extends Model
{
    protected $guarded = ['id'];
    protected $hidden = ['api_token'];
    protected $casts = ['is_active' => 'bool', 'last_sync_at' => 'datetime'];
}
