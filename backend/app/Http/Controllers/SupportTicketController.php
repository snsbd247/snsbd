<?php

namespace App\Http\Controllers;

use App\Models\SupportTicket;
use App\Models\TicketReply;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SupportTicketController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isStaff = ! empty(array_intersect(['admin','staff'], $user->roles()->pluck('role')->all()));
        $q = SupportTicket::query()->orderByDesc('last_reply_at')->orderByDesc('id');
        if (! $isStaff) $q->where('customer_id', $user->id);
        if ($request->filled('status')) $q->where('status', $request->input('status'));
        return response()->json($q->get());
    }

    public function show(Request $request, int $id)
    {
        $t = SupportTicket::with(['replies.author:id,email', 'customer:id,email'])->findOrFail($id);
        $this->authorizeAccess($request, $t);
        return response()->json($t);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'subject' => 'required|string|max:191',
            'department' => 'nullable|string|max:64',
            'priority' => 'nullable|string|max:32',
            'body' => 'required|string',
        ]);
        $ticket = SupportTicket::create([
            'ticket_number' => 'T-'.strtoupper(Str::random(8)),
            'customer_id' => $request->user()->id,
            'subject' => $data['subject'],
            'department' => $data['department'] ?? 'general',
            'priority' => $data['priority'] ?? 'normal',
            'status' => 'open',
            'last_reply_at' => now(),
        ]);
        TicketReply::create([
            'ticket_id' => $ticket->id,
            'author_id' => $request->user()->id,
            'body' => $data['body'],
            'is_staff' => false,
        ]);
        return response()->json($ticket, 201);
    }

    public function reply(Request $request, int $id)
    {
        $data = $request->validate(['body' => 'required|string']);
        $ticket = SupportTicket::findOrFail($id);
        $this->authorizeAccess($request, $ticket);
        $user = $request->user();
        $isStaff = ! empty(array_intersect(['admin','staff'], $user->roles()->pluck('role')->all()));
        $reply = TicketReply::create([
            'ticket_id' => $ticket->id,
            'author_id' => $user->id,
            'body' => $data['body'],
            'is_staff' => $isStaff,
        ]);
        $ticket->update([
            'last_reply_at' => now(),
            'status' => $isStaff ? 'answered' : 'pending',
        ]);
        return response()->json($reply, 201);
    }

    public function close(Request $request, int $id)
    {
        $ticket = SupportTicket::findOrFail($id);
        $this->authorizeAccess($request, $ticket);
        $ticket->update(['status' => 'closed']);
        return response()->json(['ok' => true]);
    }

    protected function authorizeAccess(Request $request, SupportTicket $t): void
    {
        $user = $request->user();
        $isStaff = ! empty(array_intersect(['admin','staff'], $user->roles()->pluck('role')->all()));
        if (! $isStaff && $t->customer_id !== $user->id) abort(403, 'Forbidden');
    }
}
