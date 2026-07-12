<?php

namespace App\Http\Controllers;

use App\Models\SalaryPayment;

class SalaryPaymentController extends ApiCrudController
{
    protected string $modelClass = SalaryPayment::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
