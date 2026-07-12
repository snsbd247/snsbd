<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Generic CRUD controller for admin-managed resources.
 *
 * Subclass and set $modelClass + $rules. Overwrite methods for custom logic.
 */
abstract class ApiCrudController extends Controller
{
    /** @var class-string<Model> */
    protected string $modelClass;

    /** Validation rules (used for both store + update). */
    protected array $rules = [];

    /** Default sort column when listing. */
    protected string $orderBy = 'id';
    protected string $orderDir = 'desc';

    /** Optional per-page. Set to 0 to return all. */
    protected int $perPage = 50;

    public function index(Request $request)
    {
        $query = $this->modelClass::query()->orderBy($this->orderBy, $this->orderDir);

        if ($request->filled('q') && ! empty($this->searchable ?? [])) {
            $q = $request->input('q');
            $query->where(function ($sub) use ($q) {
                foreach ($this->searchable as $col) {
                    $sub->orWhere($col, 'like', "%$q%");
                }
            });
        }

        if ($this->perPage > 0) {
            return response()->json($query->paginate($request->integer('per_page', $this->perPage)));
        }
        return response()->json($query->get());
    }

    public function show(int $id)
    {
        return response()->json($this->modelClass::findOrFail($id));
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        return response()->json($this->modelClass::create($data), 201);
    }

    public function update(Request $request, int $id)
    {
        $data = $request->validate($this->rulesForUpdate());
        $row = $this->modelClass::findOrFail($id);
        $row->update($data);
        return response()->json($row);
    }

    public function destroy(int $id)
    {
        $this->modelClass::findOrFail($id)->delete();
        return response()->json(['ok' => true]);
    }

    /** Convert store rules to update rules (add "sometimes" to required). */
    protected function rulesForUpdate(): array
    {
        $out = [];
        foreach ($this->rules as $field => $rule) {
            if (is_string($rule)) {
                $out[$field] = str_contains($rule, 'required') ? 'sometimes|'.$rule : $rule;
            } else {
                $out[$field] = $rule;
            }
        }
        return $out;
    }
}
