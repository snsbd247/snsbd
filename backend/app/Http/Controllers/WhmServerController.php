<?php

namespace App\Http\Controllers;

use App\Models\WhmServer;

class WhmServerController extends ApiCrudController
{
    protected string $modelClass = WhmServer::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
