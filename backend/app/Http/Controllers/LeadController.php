<?php

namespace App\Http\Controllers;

use App\Models\Lead;

class LeadController extends ApiCrudController
{
    protected string $modelClass = Lead::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
