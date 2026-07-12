<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Project extends Model
{
    protected $guarded = ['id'];
    protected $casts = ['start_date' => 'date', 'end_date' => 'date', 'budget' => 'decimal:2'];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function milestones() { return $this->hasMany(ProjectMilestone::class)->orderBy('sort_order'); }
    public function activityLogs() { return $this->hasMany(ProjectActivityLog::class); }
}
