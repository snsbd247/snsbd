<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketReply extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['is_staff' => 'bool'];

    public function ticket() { return $this->belongsTo(SupportTicket::class, 'ticket_id'); }
    public function author() { return $this->belongsTo(User::class, 'author_id'); }
}
