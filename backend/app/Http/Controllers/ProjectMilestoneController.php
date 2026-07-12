<?php

namespace App\Http\Controllers;

use App\Models\ProjectMilestone;

class ProjectMilestoneController extends ApiCrudController
{
    protected string $modelClass = ProjectMilestone::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
