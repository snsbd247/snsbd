<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $table = 'company_settings';

    protected $fillable = [
        'company_name', 'logo_url', 'favicon_url', 'email', 'phone',
        'address', 'website', 'facebook_url', 'footer_copyright',
        'late_fee_percent',
    ];

    protected $casts = [
        'late_fee_percent' => 'decimal:2',
    ];

    public static function current(): self
    {
        return static::firstOrCreate(
            ['id' => 1],
            ['company_name' => 'SyncSolutionBD', 'late_fee_percent' => 0]
        );
    }
}
