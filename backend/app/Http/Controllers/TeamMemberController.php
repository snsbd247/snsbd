<?php

namespace App\Http\Controllers;

use App\Models\TeamMember;

class TeamMemberController extends ApiCrudController
{
    protected string $modelClass = TeamMember::class;
    protected int $perPage = 0;
    protected array $searchable = ['full_name', 'email', 'role'];
    protected array $rules = [
        'user_id' => 'nullable|integer|exists:users,id',
        'full_name' => 'required|string|max:191',
        'email' => 'nullable|email|max:191',
        'phone' => 'nullable|string|max:64',
        'role' => 'nullable|string|max:64',
        'department' => 'nullable|string|max:64',
        'monthly_salary' => 'nullable|numeric|min:0',
        'joined_at' => 'nullable|date',
        'active' => 'nullable|boolean',
        'notes' => 'nullable|string',
    ];
}
