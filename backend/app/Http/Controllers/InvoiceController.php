<?php

namespace App\Http\Controllers;

use App\Models\Invoice;

class InvoiceController extends ApiCrudController
{
    protected string $modelClass = Invoice::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
