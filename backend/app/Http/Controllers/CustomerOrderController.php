<?php

namespace App\Http\Controllers;

use App\Models\CustomerOrder;
use App\Models\HostingPackage;
use App\Models\OrderDomainChange;
use App\Models\ProductAddon;
use App\Models\Coupon;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerOrderController extends ApiCrudController
{
    protected string $modelClass = CustomerOrder::class;
    protected int $perPage = 0;
    protected array $rules = [
        'order_type' => 'nullable|string|max:32',
        'hosting_package_id' => 'nullable|integer',
        'service_catalog_id' => 'nullable|integer',
        'domain_name' => 'nullable|string|max:191',
        'quoted_price' => 'nullable|numeric|min:0',
        'billing_cycle' => 'nullable|string|max:32',
        'status' => 'nullable|string|max:32',
        'payment_method' => 'nullable|string|max:64',
        'manual_trx_id' => 'nullable|string|max:128',
        'manual_sender' => 'nullable|string|max:128',
        'customer_notes' => 'nullable|string',
        'admin_notes' => 'nullable|string',
    ];

    /** Customer-facing: create a hosting order. */
    public function placeHosting(Request $request)
    {
        $data = $request->validate([
            'package_id' => 'required|integer|exists:hosting_packages,id',
            'domain_name' => 'required|string|max:191',
            'billing_cycle' => 'nullable|string|max:32',
            'payment_method' => 'required|string|max:64',
            'manual_trx_id' => 'nullable|string|max:128',
            'manual_sender' => 'nullable|string|max:128',
            'customer_notes' => 'nullable|string',
            'addon_ids' => 'nullable|array',
            'addon_ids.*' => 'integer|exists:product_addons,id',
            'coupon_code' => 'nullable|string|max:64',
        ]);

        if ($data['payment_method'] === 'manual_bkash' && empty($data['manual_trx_id'])) {
            return response()->json(['message' => 'bKash transaction ID required'], 422);
        }

        $pkg = HostingPackage::findOrFail($data['package_id']);
        $subtotal = (float) $pkg->price;

        $addons = collect();
        if (! empty($data['addon_ids'])) {
            $addons = ProductAddon::whereIn('id', $data['addon_ids'])->where('is_active', true)->get();
            $subtotal += (float) $addons->sum('price');
        }

        $discount = 0.0;
        $couponCode = null;
        if (! empty($data['coupon_code'])) {
            $code = strtoupper(trim($data['coupon_code']));
            $c = Coupon::where('code', $code)->first();
            if ($c && $c->is_active
                && (! $c->expires_at || $c->expires_at >= now())
                && ($c->max_uses === null || $c->used_count < $c->max_uses)) {
                if ($c->discount_percent) $discount += $subtotal * ($c->discount_percent / 100);
                if ($c->discount_amount) $discount += (float) $c->discount_amount;
                $discount = min($discount, $subtotal);
                $couponCode = $c->code;
                $c->increment('used_count');
            }
        }
        $total = max(0, $subtotal - $discount);

        $notes = collect([
            $data['customer_notes'] ?? null,
            $addons->count() ? 'Add-ons: '.$addons->pluck('name')->implode(', ') : null,
            $couponCode ? "Coupon {$couponCode} (-".number_format($discount, 2).")" : null,
        ])->filter()->implode(' | ');

        $order = CustomerOrder::create([
            'customer_id' => $request->user()->id,
            'order_type' => 'hosting',
            'hosting_package_id' => $pkg->id,
            'domain_name' => strtolower(trim($data['domain_name'])),
            'quoted_price' => $total,
            'status' => 'pending',
            'billing_cycle' => $data['billing_cycle'] ?? $pkg->billing_cycle,
            'payment_method' => $data['payment_method'],
            'manual_trx_id' => $data['manual_trx_id'] ?? null,
            'manual_sender' => $data['manual_sender'] ?? null,
            'customer_notes' => $notes ?: null,
        ]);

        return response()->json([
            'order_id' => $order->id,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'total' => $total,
        ], 201);
    }

    /** Admin: activate a pending order → create Service row. */
    public function activate(Request $request, int $id)
    {
        $data = $request->validate(['whm_server_id' => 'nullable|integer']);

        return DB::transaction(function () use ($id, $data) {
            $order = CustomerOrder::with('hostingPackage')->findOrFail($id);
            if ($order->status === 'completed') abort(422, 'Order already active');
            if ($order->order_type !== 'hosting') abort(422, 'Not a hosting order');

            $domain = strtolower(trim($order->domain_name ?? ''));
            if (! $domain) abort(422, 'Domain missing');

            $cpanelUser = substr(preg_replace('/[^a-z0-9]/', '', explode('.', $domain)[0]), 0, 8)
                ?: 'u'.substr(base_convert((string) time(), 10, 36), -6);

            $svc = Service::create([
                'customer_id' => $order->customer_id,
                'type' => 'hosting',
                'name' => $domain,
                'domain' => $domain,
                'status' => 'active',
                'start_date' => now()->toDateString(),
                'price' => $order->quoted_price,
                'billing_cycle' => $order->billing_cycle,
                'hosting_package_id' => $order->hosting_package_id,
                'whm_username' => $cpanelUser,
            ]);

            $order->update([
                'status' => 'completed',
                'activated_service_id' => $svc->id,
                'whm_server_id' => $data['whm_server_id'] ?? $order->whm_server_id,
                'admin_notes' => trim(($order->admin_notes ?? '')."\nActivated by admin."),
            ]);

            return response()->json([
                'ok' => true,
                'service_id' => $svc->id,
                'cpanel_username' => $cpanelUser,
            ]);
        });
    }

    /** Admin: change domain on a not-yet-activated order. */
    public function changeDomain(Request $request, int $id)
    {
        $data = $request->validate(['domain_name' => 'required|string|max:191']);
        $order = CustomerOrder::findOrFail($id);
        if ($order->status === 'completed') abort(422, 'Order already activated');

        $old = $order->domain_name;
        $new = strtolower(trim($data['domain_name']));
        if ($old === $new) return response()->json(['ok' => true, 'changed' => false]);

        $order->update(['domain_name' => $new]);
        OrderDomainChange::create([
            'order_id' => $order->id,
            'actor_id' => $request->user()->id,
            'old_domain' => $old,
            'new_domain' => $new,
        ]);

        return response()->json(['ok' => true, 'changed' => true]);
    }
}
