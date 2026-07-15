<?php

namespace App\Http\Controllers;

use App\Models\SalaryPayment;
use Illuminate\Http\Request;

class SalaryPaymentController extends ApiCrudController
{
    protected string $modelClass = SalaryPayment::class;
    protected int $perPage = 0;
    protected string $orderBy = 'paid_at';
    protected array $rules = [
        'team_member_id' => 'required|integer|exists:team_members,id',
        'amount' => 'required|numeric|min:0',
        'paid_at' => 'required|date',
        'period' => 'nullable|string|max:32',
        'method' => 'nullable|string|max:64',
        'notes' => 'nullable|string',
    ];

    public function index(Request $request)
    {
        $q = SalaryPayment::query()->orderByDesc('paid_at');
        if ($request->filled('team_member_id')) $q->where('team_member_id', $request->integer('team_member_id'));
        return response()->json($q->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        $data['recorded_by'] = $request->user()->id;
        return response()->json(SalaryPayment::create($data), 201);
    }
}
