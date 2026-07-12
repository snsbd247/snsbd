<?php

namespace App\Http\Controllers;

use App\Models\Service;

class ServiceController extends ApiCrudController
{
    protected string $modelClass = Service::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
