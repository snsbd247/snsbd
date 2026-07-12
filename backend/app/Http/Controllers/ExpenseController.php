<?php

namespace App\Http\Controllers;

use App\Models\Expense;

class ExpenseController extends ApiCrudController
{
    protected string $modelClass = Expense::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
