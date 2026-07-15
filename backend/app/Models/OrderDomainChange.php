<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderDomainChange extends Model
{
    protected $guarded = ['id'];

    public function order() { return $this->belongsTo(CustomerOrder::class, 'order_id'); }
    public function actor() { return $this->belongsTo(User::class, 'actor_id'); }
}
