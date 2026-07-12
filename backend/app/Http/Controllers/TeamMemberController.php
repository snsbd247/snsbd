<?php

namespace App\Http\Controllers;

use App\Models\TeamMember;

class TeamMemberController extends ApiCrudController
{
    protected string $modelClass = TeamMember::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
