<?php

namespace App\Http\Controllers;

use App\Models\DomainPricing;

class DomainPricingController extends ApiCrudController
{
    protected string $modelClass = DomainPricing::class;
    protected array $searchable = ['tld'];
    protected string $orderBy = 'sort_order';
    protected string $orderDir = 'asc';

    protected array $rules = [
        'tld' => 'required|string|max:32',
        'register_price' => 'nullable|numeric|min:0',
        'renew_price' => 'nullable|numeric|min:0',
        'transfer_price' => 'nullable|numeric|min:0',
        'currency' => 'nullable|string|max:8',
        'featured' => 'nullable|boolean',
        'is_active' => 'nullable|boolean',
        'sort_order' => 'nullable|integer',
    ];
}
