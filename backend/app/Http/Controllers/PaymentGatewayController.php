<?php

namespace App\Http\Controllers;

use App\Models\PaymentGateway;

class PaymentGatewayController extends ApiCrudController
{
    protected string $modelClass = PaymentGateway::class;
    protected array $rules = [];
    protected int $perPage = 0;
}
