<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserCustomRole extends Model
{
    protected $table = 'user_custom_roles';
    protected $fillable = ['user_id', 'role'];

    public const ROLES = ['admin', 'customer', 'moderator', 'reseller', 'staff'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
