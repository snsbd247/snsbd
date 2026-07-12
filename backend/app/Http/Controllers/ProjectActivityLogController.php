<?php

namespace App\Http\Controllers;

use App\Models\ProjectActivityLog;

class ProjectActivityLogController extends ApiCrudController
{
    protected string $modelClass = ProjectActivityLog::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
