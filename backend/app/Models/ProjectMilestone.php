<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectMilestone extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['completed' => 'bool', 'due_date' => 'date', 'completed_at' => 'datetime'];

    public function project() { return $this->belongsTo(Project::class); }
}
