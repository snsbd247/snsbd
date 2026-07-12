<?php

namespace App\Http\Controllers;

use App\Models\Project;

class ProjectController extends ApiCrudController
{
    protected string $modelClass = Project::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
