<?php

namespace App\Http\Controllers;

use App\Models\Payment;

class PaymentController extends ApiCrudController
{
    protected string $modelClass = Payment::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
