<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceAddon extends Model
{
    protected $fillable = ['service_id','addon_id','price_snapshot'];
    protected $casts = ['price_snapshot' => 'decimal:2'];

    public function service(): BelongsTo { return $this->belongsTo(Service::class); }
    public function addon(): BelongsTo   { return $this->belongsTo(ProductAddon::class, 'addon_id'); }
}
