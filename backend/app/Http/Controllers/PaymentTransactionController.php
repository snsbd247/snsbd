<?php

namespace App\Http\Controllers;

use App\Models\PaymentTransaction;

class PaymentTransactionController extends ApiCrudController
{
    protected string $modelClass = PaymentTransaction::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
