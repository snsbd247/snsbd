<?php

namespace App\Http\Controllers;

use App\Models\ProjectActivityLog;
use Illuminate\Http\Request;

class ProjectActivityLogController extends ApiCrudController
{
    protected string $modelClass = ProjectActivityLog::class;
    protected int $perPage = 0;
    protected string $orderBy = 'created_at';
    protected array $rules = [
        'project_id' => 'required|integer|exists:projects,id',
        'action' => 'required|string|max:64',
        'message' => 'nullable|string',
        'details' => 'nullable|array',
    ];

    public function index(Request $request)
    {
        $q = ProjectActivityLog::query()->orderByDesc('created_at');
        if ($request->filled('project_id')) $q->where('project_id', $request->integer('project_id'));
        return response()->json($q->limit($request->integer('limit', 100))->get());
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        $data['actor_id'] = $request->user()->id;
        return response()->json(ProjectActivityLog::create($data), 201);
    }
}
