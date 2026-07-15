<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupportTicket extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['last_reply_at' => 'datetime'];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function assignee() { return $this->belongsTo(User::class, 'assigned_to'); }
    public function replies() { return $this->hasMany(TicketReply::class, 'ticket_id')->orderBy('created_at'); }
}
