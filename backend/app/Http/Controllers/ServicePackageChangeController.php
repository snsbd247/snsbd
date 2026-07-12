<?php

namespace App\Http\Controllers;

use App\Models\ServicePackageChange;

class ServicePackageChangeController extends ApiCrudController
{
    protected string $modelClass = ServicePackageChange::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
