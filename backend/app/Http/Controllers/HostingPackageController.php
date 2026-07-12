<?php

namespace App\Http\Controllers;

use App\Models\HostingPackage;

class HostingPackageController extends ApiCrudController
{
    protected string $modelClass = HostingPackage::class;
    protected array $searchable = ['name', 'category', 'tagline'];
    protected string $orderBy = 'sort_order';
    protected string $orderDir = 'asc';

    protected array $rules = [
        'name' => 'required|string|max:255',
        'description' => 'nullable|string',
        'category' => 'nullable|string|max:32',
        'tagline' => 'nullable|string|max:255',
        'disk_space' => 'nullable|string|max:64',
        'bandwidth' => 'nullable|string|max:64',
        'features' => 'nullable|array',
        'price' => 'nullable|numeric|min:0',
        'billing_cycle' => 'nullable|string|max:32',
        'featured' => 'nullable|boolean',
        'badge' => 'nullable|string|max:64',
        'is_active' => 'nullable|boolean',
        'sort_order' => 'nullable|integer',
    ];
}
