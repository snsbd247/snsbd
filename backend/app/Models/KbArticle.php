<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KbArticle extends Model
{
    protected $table = 'kb_articles';
    protected $guarded = ['id'];
    protected $casts = ['is_published' => 'bool'];

    public function author() { return $this->belongsTo(User::class, 'author_id'); }
}
