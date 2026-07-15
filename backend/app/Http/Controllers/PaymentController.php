<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $u = $request->user();
        $q = Payment::with(['invoice', 'gateway', 'transactions'])->orderByDesc('id');
        if (! ($u->hasRole('admin') || $u->hasRole('staff'))) {
            $q->whereHas('invoice', fn ($x) => $x->where('customer_id', $u->id));
        }
        return response()->json($q->paginate((int) $request->query('per_page', 25)));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'invoice_id'    => 'required|integer|exists:invoices,id',
            'amount'        => 'required|numeric|min:0.01',
            'gateway_id'    => 'nullable|integer|exists:payment_gateways,id',
            'reference'     => 'nullable|string|max:191',
            'currency_code' => 'nullable|string|size:3',
            'notes'         => 'nullable|string',
        ]);

        $u   = $request->user();
        $inv = Invoice::findOrFail($data['invoice_id']);
        if ($inv->customer_id !== $u->id && ! ($u->hasRole('admin') || $u->hasRole('staff'))) {
            abort(403);
        }

        $payment = DB::transaction(function () use ($data, $inv) {
            $p = Payment::create([
                'invoice_id'    => $inv->id,
                'gateway_id'    => $data['gateway_id']    ?? null,
                'amount'        => $data['amount'],
                'currency_code' => $data['currency_code'] ?? $inv->currency_code,
                'status'        => 'pending',
                'reference'     => $data['reference'] ?? null,
                'notes'         => $data['notes']     ?? null,
            ]);
            return $p;
        });

        return response()->json($payment, 201);
    }

    public function markPaid(Request $request, Payment $payment): JsonResponse
    {
        $u = $request->user();
        if (! ($u->hasRole('admin') || $u->hasRole('staff'))) abort(403);

        DB::transaction(function () use ($payment) {
            $payment->update(['status' => 'succeeded', 'paid_at' => now()]);

            $inv = $payment->invoice()->lockForUpdate()->first();
            $paid = (float) $inv->payments()->where('status', 'succeeded')->sum('amount');
            $inv->amount_paid = $paid;
            $inv->status = $paid >= (float) $inv->total ? 'paid'
                          : ($paid > 0 ? 'partial' : $inv->status);
            if ($inv->status === 'paid') $inv->paid_at = now();
            $inv->save();
        });

        return response()->json($payment->fresh(['invoice']));
    }
}
