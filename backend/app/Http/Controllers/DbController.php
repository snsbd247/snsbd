<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Generic Supabase-compatible query endpoint.
 *
 * Body:
 *   { table, op: 'select'|'insert'|'update'|'delete'|'upsert',
 *     select: '*, profiles(full_name, email)',
 *     ops: [ ['eq','col','val'], ['order','col',{ascending:true}], ... ],
 *     single, maybeSingle, count, head,
 *     payload, onConflict }
 *
 * Response: { data, error, count }
 */
class DbController extends Controller
{
    /** Supabase table name → Eloquent model. */
    protected array $tables = [
        'profiles' => \App\Models\User::class,
        'user_roles' => \App\Models\UserCustomRole::class,
        'company_settings' => \App\Models\CompanySetting::class,
        'hosting_packages' => \App\Models\HostingPackage::class,
        'domain_pricing' => \App\Models\DomainPricing::class,
        'services' => \App\Models\Service::class,
        'service_catalog' => \App\Models\ServiceCatalog::class,
        'service_package_changes' => \App\Models\ServicePackageChange::class,
        'customer_orders' => \App\Models\CustomerOrder::class,
        'invoices' => \App\Models\Invoice::class,
        'invoice_items' => \App\Models\InvoiceItem::class,
        'payments' => \App\Models\Payment::class,
        'payment_gateways' => \App\Models\PaymentGateway::class,
        'payment_transactions' => \App\Models\PaymentTransaction::class,
        'projects' => \App\Models\Project::class,
        'project_milestones' => \App\Models\ProjectMilestone::class,
        'project_activity_log' => \App\Models\ProjectActivityLog::class,
        'leads' => \App\Models\Lead::class,
        'expenses' => \App\Models\Expense::class,
        'salary_payments' => \App\Models\SalaryPayment::class,
        'team_members' => \App\Models\TeamMember::class,
        'whm_servers' => \App\Models\WhmServer::class,
    ];

    /**
     * Table → { relation_alias => [related_table, fk_on_this_table] }.
     * Used to expand Supabase-style nested selects: `*, profiles(full_name)`.
     */
    protected array $relations = [
        'services'          => ['profiles' => ['profiles', 'customer_id']],
        'invoices'          => ['profiles' => ['profiles', 'customer_id']],
        'customer_orders'   => ['profiles' => ['profiles', 'customer_id']],
        'projects'          => ['profiles' => ['profiles', 'customer_id']],
        'invoice_items'     => ['services' => ['services', 'service_id'],
                                'invoices' => ['invoices', 'invoice_id']],
        'payments'          => ['invoices' => ['invoices', 'invoice_id']],
        'project_milestones'=> ['projects' => ['projects', 'project_id']],
        'salary_payments'   => ['team_members' => ['team_members', 'team_member_id']],
    ];

    public function query(Request $req)
    {
        $t = $req->input('table');
        if (! isset($this->tables[$t])) {
            return response()->json(['data' => null, 'error' => ['message' => "Unknown table: $t"]], 400);
        }
        $M = $this->tables[$t];
        $op = $req->input('op', 'select');

        try {
            if ($op === 'select')  return $this->doSelect($req, $t, $M);
            if ($op === 'insert')  return $this->doInsert($req, $M);
            if ($op === 'update')  return $this->doUpdate($req, $M);
            if ($op === 'delete')  return $this->doDelete($req, $M);
            if ($op === 'upsert')  return $this->doUpsert($req, $M);
        } catch (\Throwable $e) {
            return response()->json(['data' => null, 'error' => ['message' => $e->getMessage()]], 500);
        }

        return response()->json(['data' => null, 'error' => ['message' => "Unknown op: $op"]], 400);
    }

    private function doSelect(Request $req, string $t, string $M)
    {
        $q = $M::query();
        [$cols, $joins] = $this->parseSelect((string) $req->input('select', '*'));
        $this->applyOps($q, $req->input('ops', []));

        $count = null;
        if ($req->boolean('count')) {
            $count = (clone $q)->count();
            if ($req->boolean('head')) {
                return response()->json(['data' => null, 'count' => $count, 'error' => null]);
            }
        }
        $rows = $q->get(in_array('*', $cols, true) ? ['*'] : $cols);

        foreach ($joins as $rel => $relCols) {
            $spec = $this->relations[$t][$rel] ?? null;
            if (! $spec) continue;
            [$relTable, $fk] = $spec;
            $ids = $rows->pluck($fk)->filter()->unique()->values()->all();
            if (empty($ids)) continue;
            $pick = in_array('*', $relCols, true) ? ['*'] : array_values(array_unique(array_merge(['id'], $relCols)));
            $relRows = DB::table($relTable)->whereIn('id', $ids)->get($pick)->keyBy('id');
            foreach ($rows as $row) {
                $row->{$rel} = $relRows[$row->{$fk}] ?? null;
            }
        }
        $data = $rows->values()->all();

        if ($req->boolean('single')) {
            if (count($data) !== 1) {
                return response()->json(['data' => null, 'error' => ['message' => 'Expected 1 row', 'code' => 'PGRST116']]);
            }
            return response()->json(['data' => $data[0], 'error' => null]);
        }
        if ($req->boolean('maybeSingle')) {
            return response()->json(['data' => count($data) ? $data[0] : null, 'error' => null]);
        }
        return response()->json(['data' => $data, 'count' => $count, 'error' => null]);
    }

    private function doInsert(Request $req, string $M)
    {
        $payload = $req->input('payload');
        $isList = array_is_list($payload);
        $rows = $isList ? $payload : [$payload];
        $created = [];
        foreach ($rows as $row) $created[] = $M::create($row);
        return response()->json(['data' => $isList ? $created : $created[0], 'error' => null]);
    }

    private function doUpdate(Request $req, string $M)
    {
        $q = $M::query();
        $this->applyOps($q, $req->input('ops', []));
        $q->update($req->input('payload'));
        $rows = (clone $q)->get()->values()->all();
        return response()->json(['data' => $rows, 'error' => null]);
    }

    private function doDelete(Request $req, string $M)
    {
        $q = $M::query();
        $this->applyOps($q, $req->input('ops', []));
        $rows = (clone $q)->get()->values()->all();
        $q->delete();
        return response()->json(['data' => $rows, 'error' => null]);
    }

    private function doUpsert(Request $req, string $M)
    {
        $payload = $req->input('payload');
        $rows = array_is_list($payload) ? $payload : [$payload];
        $keys = array_map('trim', explode(',', (string) $req->input('onConflict', 'id')));
        $out = [];
        foreach ($rows as $row) {
            $where = [];
            foreach ($keys as $k) $where[$k] = $row[$k] ?? null;
            $existing = $M::where($where)->first();
            if ($existing) { $existing->update($row); $out[] = $existing->fresh(); }
            else { $out[] = $M::create($row); }
        }
        return response()->json(['data' => $out, 'error' => null]);
    }

    /** "*, profiles(full_name, email)" → [ ['*'], ['profiles' => ['full_name','email']] ] */
    private function parseSelect(string $s): array
    {
        $cols = []; $joins = []; $parts = []; $buf = ''; $depth = 0;
        for ($i = 0, $n = strlen($s); $i < $n; $i++) {
            $ch = $s[$i];
            if ($ch === '(') { $depth++; $buf .= $ch; }
            elseif ($ch === ')') { $depth--; $buf .= $ch; }
            elseif ($ch === ',' && $depth === 0) { $parts[] = trim($buf); $buf = ''; }
            else $buf .= $ch;
        }
        if (trim($buf) !== '') $parts[] = trim($buf);
        foreach ($parts as $p) {
            if (preg_match('/^([a-z_][a-z0-9_]*)\((.+)\)$/i', $p, $m)) {
                $joins[$m[1]] = array_map('trim', explode(',', $m[2]));
            } else {
                $cols[] = $p;
            }
        }
        if (empty($cols)) $cols = ['*'];
        return [$cols, $joins];
    }

    private function applyOps($q, array $ops): void
    {
        foreach ($ops as $op) {
            $fn = $op[0] ?? null;
            switch ($fn) {
                case 'eq':   $op[2] === null ? $q->whereNull($op[1]) : $q->where($op[1], $op[2]); break;
                case 'neq':  $q->where($op[1], '!=', $op[2]); break;
                case 'gt':   $q->where($op[1], '>',  $op[2]); break;
                case 'gte':  $q->where($op[1], '>=', $op[2]); break;
                case 'lt':   $q->where($op[1], '<',  $op[2]); break;
                case 'lte':  $q->where($op[1], '<=', $op[2]); break;
                case 'in':   $q->whereIn($op[1], (array) $op[2]); break;
                case 'is':   $op[2] === null ? $q->whereNull($op[1]) : $q->where($op[1], $op[2]); break;
                case 'like': case 'ilike': $q->where($op[1], 'like', $op[2]); break;
                case 'order':
                    $opts = $op[2] ?? [];
                    $dir = ($opts['ascending'] ?? true) ? 'asc' : 'desc';
                    $q->orderBy($op[1], $dir);
                    break;
                case 'limit': $q->limit((int) $op[1]); break;
                case 'range':
                    $q->offset((int) $op[1])->limit((int) $op[2] - (int) $op[1] + 1); break;
            }
        }
    }
}
