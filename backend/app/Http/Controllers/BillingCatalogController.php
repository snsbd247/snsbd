<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\Currency;
use App\Models\InvoiceTemplate;
use App\Models\PaymentGateway;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillingCatalogController extends Controller
{
    // Currencies
    public function currencies(): JsonResponse
    {
        return response()->json(Currency::orderBy('code')->get());
    }

    // Coupons — admin only for write; list is admin-only too
    public function coupons(Request $request): JsonResponse
    {
        $this->admin($request);
        return response()->json(Coupon::orderByDesc('id')->paginate(50));
    }

    public function storeCoupon(Request $request): JsonResponse
    {
        $this->admin($request);
        $data = $request->validate([
            'code'              => 'required|string|max:64|unique:coupons,code',
            'description'       => 'nullable|string',
            'discount_percent'  => 'nullable|numeric|min:0|max:100',
            'discount_amount'   => 'nullable|numeric|min:0',
            'max_uses'          => 'nullable|integer|min:1',
            'expires_at'        => 'nullable|date',
            'is_active'         => 'boolean',
        ]);
        return response()->json(Coupon::create($data), 201);
    }

    // Invoice templates
    public function templates(): JsonResponse
    {
        return response()->json(
            InvoiceTemplate::where('is_active', true)->orderBy('sort_order')->get()
        );
    }

    public function storeTemplate(Request $request): JsonResponse
    {
        $this->admin($request);
        $data = $request->validate([
            'template_key' => 'required|string|max:64|unique:invoice_templates,template_key',
            'name'         => 'required|string|max:191',
            'description'  => 'nullable|string',
            'theme'        => 'required|array',
            'is_default'   => 'boolean',
            'is_active'    => 'boolean',
            'sort_order'   => 'nullable|integer',
        ]);
        return response()->json(InvoiceTemplate::create($data), 201);
    }

    // Payment gateways
    public function gateways(): JsonResponse
    {
        return response()->json(
            PaymentGateway::where('is_active', true)->orderBy('sort_order')->get()
        );
    }

    private function admin(Request $r): void
    {
        $u = $r->user();
        if (! ($u && ($u->hasRole('admin') || $u->hasRole('staff')))) abort(403);
    }
}
