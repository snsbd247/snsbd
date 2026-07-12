<?php

namespace App\Http\Controllers;

use App\Models\ServiceCatalog;

class ServiceCatalogController extends ApiCrudController
{
    protected string $modelClass = ServiceCatalog::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
