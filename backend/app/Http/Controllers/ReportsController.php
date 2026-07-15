<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Payment;
use App\Models\SalaryPayment;
use App\Models\Service;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsController extends Controller
{
    /**
     * GET /api/v1/reports/dashboard
     * Aggregated counters for the admin dashboard.
     */
    public function dashboard(Request $request)
    {
        $now = now();
        $monthStart = $now->copy()->startOfMonth();

        return response()->json([
            'invoices' => [
                'total'   => (int) Invoice::count(),
                'unpaid'  => (int) Invoice::where('status', '!=', 'paid')->count(),
                'overdue' => (int) Invoice::where('status', 'overdue')->count(),
            ],
            'revenue' => [
                'this_month' => (float) Payment::where('status', 'paid')
                    ->where('created_at', '>=', $monthStart)->sum('amount'),
                'lifetime'   => (float) Payment::where('status', 'paid')->sum('amount'),
            ],
            'expenses' => [
                'this_month' => (float) Expense::where('expense_date', '>=', $monthStart)->sum('amount'),
                'lifetime'   => (float) Expense::sum('amount'),
            ],
            'salaries' => [
                'this_month' => (float) SalaryPayment::where('paid_at', '>=', $monthStart)->sum('amount'),
            ],
            'services' => [
                'active'    => (int) Service::where('status', 'active')->count(),
                'suspended' => (int) Service::where('status', 'suspended')->count(),
            ],
            'crm' => [
                'open_tickets' => (int) SupportTicket::whereIn('status', ['open', 'pending'])->count(),
                'new_leads'    => (int) Lead::where('status', 'new')->count(),
            ],
        ]);
    }

    /**
     * GET /api/v1/reports/finance?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Revenue vs expense breakdown across a date range.
     */
    public function finance(Request $request)
    {
        $from = $request->query('from') ?: now()->subDays(30)->toDateString();
        $to   = $request->query('to')   ?: now()->toDateString();

        $revenue = Payment::where('status', 'paid')
            ->whereBetween('created_at', [$from . ' 00:00:00', $to . ' 23:59:59'])
            ->select(DB::raw('DATE(created_at) as d'), DB::raw('SUM(amount) as total'))
            ->groupBy('d')->orderBy('d')->get();

        $expenses = Expense::whereBetween('expense_date', [$from, $to])
            ->select(DB::raw('DATE(expense_date) as d'), DB::raw('SUM(amount) as total'))
            ->groupBy('d')->orderBy('d')->get();

        return response()->json([
            'from'     => $from,
            'to'       => $to,
            'revenue'  => $revenue,
            'expenses' => $expenses,
            'totals'   => [
                'revenue'  => (float) $revenue->sum('total'),
                'expenses' => (float) $expenses->sum('total'),
                'net'      => (float) ($revenue->sum('total') - $expenses->sum('total')),
            ],
        ]);
    }
}
