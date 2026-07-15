<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InvoiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $isAdmin = $user->hasRole('admin') || $user->hasRole('staff');

        $q = Invoice::query()->with(['items', 'customer.profile'])->orderByDesc('id');
        if (! $isAdmin) $q->where('customer_id', $user->id);

        if ($status = $request->query('status')) $q->where('status', $status);

        return response()->json($q->paginate((int) $request->query('per_page', 25)));
    }

    public function show(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeView($request, $invoice);
        return response()->json($invoice->load(['items', 'customer.profile', 'payments', 'coupon']));
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'customer_id'    => 'required|integer|exists:users,id',
            'invoice_number' => 'nullable|string|max:64|unique:invoices,invoice_number',
            'issue_date'     => 'required|date',
            'due_date'       => 'nullable|date',
            'currency_code'  => 'nullable|string|size:3',
            'template_key'   => 'nullable|string|max:64',
            'notes'          => 'nullable|string',
            'terms'          => 'nullable|string',
            'coupon_id'      => 'nullable|integer|exists:coupons,id',
            'items'                => 'required|array|min:1',
            'items.*.description'  => 'required|string',
            'items.*.quantity'     => 'required|numeric|min:0',
            'items.*.unit_price'   => 'required|numeric|min:0',
            'items.*.service_id'   => 'nullable|integer',
            'tax'      => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
        ]);

        $invoice = DB::transaction(function () use ($data) {
            $subtotal = 0.0;
            foreach ($data['items'] as $it) {
                $subtotal += ((float) $it['quantity']) * ((float) $it['unit_price']);
            }
            $tax      = (float) ($data['tax']      ?? 0);
            $discount = (float) ($data['discount'] ?? 0);
            $total    = max(0, $subtotal + $tax - $discount);

            $inv = Invoice::create([
                'customer_id'    => $data['customer_id'],
                'invoice_number' => $data['invoice_number'] ?? self::nextNumber(),
                'issue_date'     => $data['issue_date'],
                'due_date'       => $data['due_date'] ?? null,
                'subtotal'       => $subtotal,
                'tax'            => $tax,
                'discount'       => $discount,
                'total'          => $total,
                'currency_code'  => $data['currency_code'] ?? 'BDT',
                'template_key'   => $data['template_key'] ?? null,
                'notes'          => $data['notes'] ?? null,
                'terms'          => $data['terms'] ?? null,
                'coupon_id'      => $data['coupon_id'] ?? null,
            ]);

            foreach ($data['items'] as $it) {
                InvoiceItem::create([
                    'invoice_id' => $inv->id,
                    'service_id' => $it['service_id'] ?? null,
                    'description'=> $it['description'],
                    'quantity'   => $it['quantity'],
                    'unit_price' => $it['unit_price'],
                    'total'      => ((float) $it['quantity']) * ((float) $it['unit_price']),
                ]);
            }
            return $inv;
        });

        return response()->json($invoice->load('items'), 201);
    }

    public function update(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'status'   => 'nullable|in:draft,sent,paid,partial,overdue,cancelled,refunded',
            'notes'    => 'nullable|string',
            'terms'    => 'nullable|string',
            'due_date' => 'nullable|date',
            'tax'      => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
        ]);

        $invoice->fill($data)->save();
        return response()->json($invoice->fresh(['items']));
    }

    public function destroy(Request $request, Invoice $invoice): JsonResponse
    {
        $this->authorizeAdmin($request);
        $invoice->delete();
        return response()->json(['ok' => true]);
    }

    // ---------- helpers ----------

    private function authorizeView(Request $r, Invoice $inv): void
    {
        $u = $r->user();
        if ($inv->customer_id !== $u->id && ! ($u->hasRole('admin') || $u->hasRole('staff'))) {
            abort(403);
        }
    }
    private function authorizeAdmin(Request $r): void
    {
        $u = $r->user();
        if (! ($u->hasRole('admin') || $u->hasRole('staff'))) abort(403);
    }

    private static function nextNumber(): string
    {
        $prefix = 'INV-' . date('Ym') . '-';
        $last = Invoice::where('invoice_number', 'like', $prefix . '%')
            ->orderByDesc('id')->value('invoice_number');
        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;
        return $prefix . str_pad((string) $seq, 5, '0', STR_PAD_LEFT);
    }
}
