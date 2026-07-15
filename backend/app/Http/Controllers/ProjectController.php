<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\ProjectActivityLog;
use Illuminate\Http\Request;

class ProjectController extends ApiCrudController
{
    protected string $modelClass = Project::class;
    protected int $perPage = 0;
    protected array $searchable = ['name'];
    protected array $rules = [
        'customer_id' => 'nullable|integer|exists:users,id',
        'manager_id' => 'nullable|integer|exists:users,id',
        'name' => 'required|string|max:191',
        'description' => 'nullable|string',
        'status' => 'nullable|string|max:32',
        'priority' => 'nullable|string|max:32',
        'start_date' => 'nullable|date',
        'end_date' => 'nullable|date',
        'budget' => 'nullable|numeric|min:0',
        'meta' => 'nullable|array',
    ];

    public function show(int $id)
    {
        $p = Project::with(['milestones', 'customer:id,email', 'activityLogs' => fn ($q) => $q->latest()->limit(50)])
            ->findOrFail($id);
        return response()->json($p);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        $p = Project::create($data);
        ProjectActivityLog::create([
            'project_id' => $p->id,
            'actor_id' => $request->user()->id,
            'action' => 'created',
            'message' => "Project '{$p->name}' created",
        ]);
        return response()->json($p, 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate($this->rulesForUpdate());
        $p = Project::findOrFail($id);
        $oldStatus = $p->status;
        $p->update($data);
        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            ProjectActivityLog::create([
                'project_id' => $p->id,
                'actor_id' => $request->user()->id,
                'action' => 'status_changed',
                'message' => "Status: {$oldStatus} → {$data['status']}",
            ]);
        }
        return response()->json($p);
    }
}
