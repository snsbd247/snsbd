<?php

namespace App\Http\Controllers;

use App\Models\HostingPackage;
use App\Models\ProductAddon;
use App\Models\Service;
use App\Models\ServiceCatalog;
use App\Models\ServiceEvent;
use App\Models\ServicePackageChange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ServiceController extends Controller
{
    // ---------- Services ----------

    public function index(Request $r): JsonResponse
    {
        $u = $r->user();
        $q = Service::query()->with(['hostingPackage','catalog','customer.profile'])->orderByDesc('id');
        if (! $this->isStaff($u)) $q->where('customer_id', $u->id);
        if ($s = $r->query('status')) $q->where('status', $s);
        return response()->json($q->paginate((int) $r->query('per_page', 25)));
    }

    public function show(Request $r, Service $service): JsonResponse
    {
        $this->authorizeView($r, $service);
        return response()->json($service->load(['hostingPackage','catalog','addons.addon','events','packageChanges']));
    }

    public function store(Request $r): JsonResponse
    {
        $this->requireStaff($r);
        $data = $r->validate([
            'customer_id'         => 'required|integer|exists:users,id',
            'name'                => 'required|string|max:191',
            'domain'              => 'nullable|string|max:191',
            'whm_username'        => 'nullable|string|max:64',
            'type'                => 'nullable|string|max:64',
            'hosting_package_id'  => 'nullable|integer|exists:hosting_packages,id',
            'catalog_id'          => 'nullable|integer|exists:service_catalog,id',
            'price'               => 'nullable|numeric|min:0',
            'billing_cycle'       => 'nullable|string|max:32',
            'start_date'          => 'nullable|date',
            'next_due_date'       => 'nullable|date',
            'notes'               => 'nullable|string',
        ]);
        $service = Service::create($data + ['status' => 'pending']);
        ServiceEvent::create([
            'service_id' => $service->id, 'status' => 'created',
            'actor_id'   => $r->user()->id, 'message' => 'Service created',
        ]);
        return response()->json($service->fresh(['hostingPackage']), 201);
    }

    public function update(Request $r, Service $service): JsonResponse
    {
        $this->requireStaff($r);
        $data = $r->validate([
            'name'                => 'nullable|string|max:191',
            'domain'              => 'nullable|string|max:191',
            'whm_username'        => 'nullable|string|max:64',
            'status'              => 'nullable|in:pending,active,suspended,terminated,cancelled',
            'price'               => 'nullable|numeric|min:0',
            'billing_cycle'       => 'nullable|string|max:32',
            'next_due_date'       => 'nullable|date',
            'termination_date'    => 'nullable|date',
            'notes'               => 'nullable|string',
        ]);

        $oldStatus = $service->status;
        $service->fill($data)->save();

        if (isset($data['status']) && $data['status'] !== $oldStatus) {
            ServiceEvent::create([
                'service_id' => $service->id, 'status' => $data['status'],
                'actor_id'   => $r->user()->id,
                'message'    => "Status changed from {$oldStatus} to {$data['status']}",
            ]);
        }
        return response()->json($service->fresh());
    }

    public function destroy(Request $r, Service $service): JsonResponse
    {
        $this->requireStaff($r);
        $service->delete();
        return response()->json(['ok' => true]);
    }

    // ---------- Package change (upgrade / downgrade) ----------

    public function changePackage(Request $r, Service $service): JsonResponse
    {
        $this->requireStaff($r);
        $data = $r->validate([
            'new_package_id' => 'required|integer|exists:hosting_packages,id',
        ]);

        DB::transaction(function () use ($service, $data, $r) {
            $old = $service->hostingPackage;
            $new = HostingPackage::findOrFail($data['new_package_id']);

            ServicePackageChange::create([
                'service_id'       => $service->id,
                'old_package_id'   => $old?->id,
                'new_package_id'   => $new->id,
                'old_package_name' => $old?->name,
                'new_package_name' => $new->name,
                'actor_id'         => $r->user()->id,
            ]);

            $service->update([
                'hosting_package_id' => $new->id,
                'price'              => $new->price,
                'billing_cycle'      => $new->billing_cycle,
            ]);

            ServiceEvent::create([
                'service_id' => $service->id,
                'status'     => 'package_changed',
                'actor_id'   => $r->user()->id,
                'message'    => 'Package changed to ' . $new->name,
            ]);
        });

        return response()->json($service->fresh(['hostingPackage','packageChanges']));
    }

    // ---------- Catalog: hosting packages ----------

    public function packages(): JsonResponse
    {
        return response()->json(
            HostingPackage::where('is_active', true)->orderBy('sort_order')->get()
        );
    }

    public function storePackage(Request $r): JsonResponse
    {
        $this->requireStaff($r);
        $data = $r->validate([
            'name'             => 'required|string|max:191',
            'description'      => 'nullable|string',
            'category'         => 'nullable|string|max:64',
            'tagline'          => 'nullable|string',
            'disk_space'       => 'nullable|string|max:64',
            'bandwidth'        => 'nullable|string|max:64',
            'features'         => 'required|array',
            'price'            => 'required|numeric|min:0',
            'billing_cycle'    => 'required|string|max:32',
            'is_active'        => 'boolean',
            'featured'         => 'boolean',
            'badge'            => 'nullable|string|max:64',
            'whm_package_name' => 'nullable|string|max:128',
            'sort_order'       => 'nullable|integer',
        ]);
        return response()->json(HostingPackage::create($data), 201);
    }

    public function updatePackage(Request $r, HostingPackage $package): JsonResponse
    {
        $this->requireStaff($r);
        $package->fill($r->all())->save();
        return response()->json($package->fresh());
    }

    public function destroyPackage(Request $r, HostingPackage $package): JsonResponse
    {
        $this->requireStaff($r);
        $package->delete();
        return response()->json(['ok' => true]);
    }

    // ---------- Catalog: service_catalog & product_addons ----------

    public function catalog(): JsonResponse
    {
        return response()->json(
            ServiceCatalog::where('is_active', true)->orderBy('sort_order')->get()
        );
    }

    public function addons(): JsonResponse
    {
        return response()->json(
            ProductAddon::where('is_active', true)->orderBy('id')->get()
        );
    }

    // ---------- helpers ----------

    private function isStaff($user): bool
    {
        return $user && ($user->hasRole('admin') || $user->hasRole('staff'));
    }
    private function requireStaff(Request $r): void
    {
        if (! $this->isStaff($r->user())) abort(403);
    }
    private function authorizeView(Request $r, Service $s): void
    {
        $u = $r->user();
        if ($s->customer_id !== $u->id && ! $this->isStaff($u)) abort(403);
    }
}
