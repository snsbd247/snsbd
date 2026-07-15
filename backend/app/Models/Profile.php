<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Profile extends Model
{
    protected $fillable = [
        'user_id', 'email', 'full_name', 'username', 'phone', 'company',
        'avatar_url', 'address', 'city', 'country', 'referral_code',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    protected static function booted(): void
    {
        static::creating(function (Profile $profile) {
            if (empty($profile->referral_code)) {
                $profile->referral_code = strtoupper(substr(md5(uniqid('', true)), 0, 8));
            }
        });
    }
}
