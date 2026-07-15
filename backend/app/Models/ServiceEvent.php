<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceEvent extends Model
{
    protected $fillable = ['service_id','status','message','actor_id','metadata'];
    protected $casts = ['metadata' => 'array'];

    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function actor(): BelongsTo   { return $this->belongsTo(User::class, 'actor_id'); }
}
