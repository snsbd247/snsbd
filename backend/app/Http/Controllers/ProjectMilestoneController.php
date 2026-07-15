<?php

namespace App\Http\Controllers;

use App\Models\ProjectMilestone;
use App\Models\ProjectActivityLog;
use Illuminate\Http\Request;

class ProjectMilestoneController extends ApiCrudController
{
    protected string $modelClass = ProjectMilestone::class;
    protected int $perPage = 0;
    protected array $rules = [
        'project_id' => 'required|integer|exists:projects,id',
        'title' => 'required|string|max:191',
        'description' => 'nullable|string',
        'due_date' => 'nullable|date',
        'completed' => 'nullable|boolean',
        'sort_order' => 'nullable|integer',
    ];

    public function index(Request $request)
    {
        $q = ProjectMilestone::query()->orderBy('sort_order');
        if ($request->filled('project_id')) $q->where('project_id', $request->integer('project_id'));
        return response()->json($q->get());
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate($this->rulesForUpdate());
        $m = ProjectMilestone::findOrFail($id);
        $wasCompleted = $m->completed;
        if (array_key_exists('completed', $data)) {
            $data['completed_at'] = $data['completed'] ? now() : null;
        }
        $m->update($data);
        if (isset($data['completed']) && $data['completed'] && ! $wasCompleted) {
            ProjectActivityLog::create([
                'project_id' => $m->project_id,
                'actor_id' => $request->user()->id,
                'action' => 'milestone_completed',
                'message' => "Milestone '{$m->title}' completed",
            ]);
        }
        return response()->json($m);
    }
}
