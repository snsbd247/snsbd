<?php

namespace App\Http\Controllers;

use App\Models\CustomerOrder;

class CustomerOrderController extends ApiCrudController
{
    protected string $modelClass = CustomerOrder::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
