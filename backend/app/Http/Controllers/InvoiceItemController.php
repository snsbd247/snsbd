<?php

namespace App\Http\Controllers;

use App\Models\InvoiceItem;

class InvoiceItemController extends ApiCrudController
{
    protected string $modelClass = InvoiceItem::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
