<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\Request;

class ExpenseController extends ApiCrudController
{
    protected string $modelClass = Expense::class;
    protected int $perPage = 0;
    protected string $orderBy = 'expense_date';
    protected array $searchable = ['title', 'category'];
    protected array $rules = [
        'title' => 'required|string|max:191',
        'description' => 'nullable|string',
        'amount' => 'required|numeric|min:0',
        'category' => 'nullable|string|max:64',
        'expense_date' => 'required|date',
        'payment_method' => 'nullable|string|max:64',
        'receipt_url' => 'nullable|string|max:500',
    ];

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        $data['recorded_by'] = $request->user()->id;
        return response()->json(Expense::create($data), 201);
    }
}
