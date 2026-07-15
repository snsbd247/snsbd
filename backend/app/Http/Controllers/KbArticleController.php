<?php

namespace App\Http\Controllers;

use App\Models\KbArticle;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KbArticleController extends ApiCrudController
{
    protected string $modelClass = KbArticle::class;
    protected int $perPage = 0;
    protected array $searchable = ['title', 'slug', 'category'];
    protected array $rules = [
        'slug' => 'nullable|string|max:191',
        'title' => 'required|string|max:191',
        'category' => 'nullable|string|max:64',
        'body' => 'required|string',
        'is_published' => 'nullable|boolean',
        'sort_order' => 'nullable|integer',
    ];

    /** Public read of published articles. */
    public function published(Request $request)
    {
        $q = KbArticle::query()->where('is_published', true)->orderBy('sort_order');
        if ($request->filled('category')) $q->where('category', $request->input('category'));
        return response()->json($q->get(['id', 'slug', 'title', 'category', 'sort_order']));
    }

    public function showBySlug(string $slug)
    {
        $a = KbArticle::where('slug', $slug)->where('is_published', true)->firstOrFail();
        return response()->json($a);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules);
        $data['slug'] = $data['slug'] ?? Str::slug($data['title']);
        $data['author_id'] = $request->user()->id;
        return response()->json(KbArticle::create($data), 201);
    }
}
