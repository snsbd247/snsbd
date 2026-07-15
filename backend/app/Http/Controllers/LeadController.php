<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;

class LeadController extends ApiCrudController
{
    protected string $modelClass = Lead::class;
    protected int $perPage = 0;
    protected array $searchable = ['name', 'email', 'phone', 'company'];
    protected array $rules = [
        'name' => 'required|string|max:191',
        'email' => 'nullable|email|max:191',
        'phone' => 'nullable|string|max:64',
        'company' => 'nullable|string|max:191',
        'source' => 'nullable|string|max:64',
        'status' => 'nullable|string|max:32',
        'notes' => 'nullable|string',
        'assigned_to' => 'nullable|integer|exists:users,id',
    ];

    /** Public capture endpoint (no auth) */
    public function capture(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:191',
            'email' => 'nullable|email|max:191',
            'phone' => 'nullable|string|max:64',
            'company' => 'nullable|string|max:191',
            'source' => 'nullable|string|max:64',
            'notes' => 'nullable|string',
        ]);
        $data['status'] = 'new';
        $lead = Lead::create($data);
        return response()->json(['ok' => true, 'id' => $lead->id], 201);
    }
}
