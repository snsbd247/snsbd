<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingCatalogController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\DomainPricingController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\KbArticleController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProjectActivityLogController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMilestoneController;
use App\Http\Controllers\ReportsController;
use App\Http\Controllers\SalaryPaymentController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SupportTicketController;
use App\Http\Controllers\TeamMemberController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('auth/login',    [AuthController::class, 'login']);
    Route::post('auth/register', [AuthController::class, 'register']);

    // Public catalog reads
    Route::get('currencies',        [BillingCatalogController::class, 'currencies']);
    Route::get('invoice-templates', [BillingCatalogController::class, 'templates']);
    Route::get('payment-gateways',  [BillingCatalogController::class, 'gateways']);
    Route::get('hosting-packages',  [ServiceController::class, 'packages']);
    Route::get('service-catalog',   [ServiceController::class, 'catalog']);
    Route::get('product-addons',    [ServiceController::class, 'addons']);
    Route::get('domain-pricing',    [DomainPricingController::class, 'index']);



    // Authenticated (Sanctum)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('auth/me',      [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // Invoices
        Route::get   ('invoices',            [InvoiceController::class, 'index']);
        Route::post  ('invoices',            [InvoiceController::class, 'store']);
        Route::get   ('invoices/{invoice}',  [InvoiceController::class, 'show']);
        Route::put   ('invoices/{invoice}',  [InvoiceController::class, 'update']);
        Route::patch ('invoices/{invoice}',  [InvoiceController::class, 'update']);
        Route::delete('invoices/{invoice}',  [InvoiceController::class, 'destroy']);

        // Payments
        Route::get ('payments',                    [PaymentController::class, 'index']);
        Route::post('payments',                    [PaymentController::class, 'store']);
        Route::post('payments/{payment}/mark-paid',[PaymentController::class, 'markPaid']);

        // Admin catalog writes
        Route::get ('coupons',            [BillingCatalogController::class, 'coupons']);
        Route::post('coupons',            [BillingCatalogController::class, 'storeCoupon']);
        Route::post('invoice-templates',  [BillingCatalogController::class, 'storeTemplate']);

        // Services
        Route::get   ('services',                        [ServiceController::class, 'index']);
        Route::post  ('services',                        [ServiceController::class, 'store']);
        Route::get   ('services/{service}',              [ServiceController::class, 'show']);
        Route::put   ('services/{service}',              [ServiceController::class, 'update']);
        Route::patch ('services/{service}',              [ServiceController::class, 'update']);
        Route::delete('services/{service}',              [ServiceController::class, 'destroy']);
        Route::post  ('services/{service}/change-package', [ServiceController::class, 'changePackage']);

        // Hosting packages admin
        Route::post  ('hosting-packages',            [ServiceController::class, 'storePackage']);
        Route::put   ('hosting-packages/{package}',  [ServiceController::class, 'updatePackage']);
        Route::patch ('hosting-packages/{package}',  [ServiceController::class, 'updatePackage']);
        Route::delete('hosting-packages/{package}',  [ServiceController::class, 'destroyPackage']);

        // Customer orders
        Route::post  ('customer-orders/hosting',                        [CustomerOrderController::class, 'placeHosting']);
        Route::get   ('customer-orders',                                [CustomerOrderController::class, 'index'])->middleware('permission:admin,staff');
        Route::get   ('customer-orders/{id}',                           [CustomerOrderController::class, 'show']);
        Route::patch ('customer-orders/{id}',                           [CustomerOrderController::class, 'update'])->middleware('permission:admin,staff');
        Route::put   ('customer-orders/{id}',                           [CustomerOrderController::class, 'update'])->middleware('permission:admin,staff');
        Route::delete('customer-orders/{id}',                           [CustomerOrderController::class, 'destroy'])->middleware('permission:admin');
        Route::post  ('customer-orders/{id}/activate',                  [CustomerOrderController::class, 'activate'])->middleware('permission:admin,staff');
        Route::post  ('customer-orders/{id}/change-domain',             [CustomerOrderController::class, 'changeDomain'])->middleware('permission:admin,staff');

        // Domain pricing admin
        Route::post  ('domain-pricing',        [DomainPricingController::class, 'store'])->middleware('permission:admin');
        Route::patch ('domain-pricing/{id}',   [DomainPricingController::class, 'update'])->middleware('permission:admin');
        Route::put   ('domain-pricing/{id}',   [DomainPricingController::class, 'update'])->middleware('permission:admin');
        Route::delete('domain-pricing/{id}',   [DomainPricingController::class, 'destroy'])->middleware('permission:admin');

        // Projects
        Route::get   ('projects',              [ProjectController::class, 'index']);
        Route::post  ('projects',              [ProjectController::class, 'store'])->middleware('permission:admin,staff');
        Route::get   ('projects/{id}',         [ProjectController::class, 'show']);
        Route::patch ('projects/{id}',         [ProjectController::class, 'update'])->middleware('permission:admin,staff');
        Route::put   ('projects/{id}',         [ProjectController::class, 'update'])->middleware('permission:admin,staff');
        Route::delete('projects/{id}',         [ProjectController::class, 'destroy'])->middleware('permission:admin');

        // Milestones
        Route::get   ('project-milestones',        [ProjectMilestoneController::class, 'index']);
        Route::post  ('project-milestones',        [ProjectMilestoneController::class, 'store'])->middleware('permission:admin,staff');
        Route::patch ('project-milestones/{id}',   [ProjectMilestoneController::class, 'update'])->middleware('permission:admin,staff');
        Route::put   ('project-milestones/{id}',   [ProjectMilestoneController::class, 'update'])->middleware('permission:admin,staff');
        Route::delete('project-milestones/{id}',   [ProjectMilestoneController::class, 'destroy'])->middleware('permission:admin,staff');

        // Project activity logs
        Route::get ('project-activity-logs', [ProjectActivityLogController::class, 'index']);
        Route::post('project-activity-logs', [ProjectActivityLogController::class, 'store'])->middleware('permission:admin,staff');

        // Leads (CRM)
        Route::get   ('leads',        [LeadController::class, 'index'])->middleware('permission:admin,staff');
        Route::post  ('leads',        [LeadController::class, 'store'])->middleware('permission:admin,staff');
        Route::get   ('leads/{id}',   [LeadController::class, 'show'])->middleware('permission:admin,staff');
        Route::patch ('leads/{id}',   [LeadController::class, 'update'])->middleware('permission:admin,staff');
        Route::put   ('leads/{id}',   [LeadController::class, 'update'])->middleware('permission:admin,staff');
        Route::delete('leads/{id}',   [LeadController::class, 'destroy'])->middleware('permission:admin,staff');

        // Support tickets
        Route::get ('tickets',              [SupportTicketController::class, 'index']);
        Route::post('tickets',              [SupportTicketController::class, 'store']);
        Route::get ('tickets/{id}',         [SupportTicketController::class, 'show']);
        Route::post('tickets/{id}/reply',   [SupportTicketController::class, 'reply']);
        Route::post('tickets/{id}/close',   [SupportTicketController::class, 'close']);

        // KB admin writes
        Route::get   ('kb-articles',        [KbArticleController::class, 'index'])->middleware('permission:admin,staff');
        Route::post  ('kb-articles',        [KbArticleController::class, 'store'])->middleware('permission:admin,staff');
        Route::patch ('kb-articles/{id}',   [KbArticleController::class, 'update'])->middleware('permission:admin,staff');
        Route::put   ('kb-articles/{id}',   [KbArticleController::class, 'update'])->middleware('permission:admin,staff');
        Route::delete('kb-articles/{id}',   [KbArticleController::class, 'destroy'])->middleware('permission:admin');

        // HR — team members
        Route::get   ('team-members',        [TeamMemberController::class, 'index'])->middleware('permission:admin,staff');
        Route::post  ('team-members',        [TeamMemberController::class, 'store'])->middleware('permission:admin');
        Route::get   ('team-members/{id}',   [TeamMemberController::class, 'show'])->middleware('permission:admin,staff');
        Route::patch ('team-members/{id}',   [TeamMemberController::class, 'update'])->middleware('permission:admin');
        Route::put   ('team-members/{id}',   [TeamMemberController::class, 'update'])->middleware('permission:admin');
        Route::delete('team-members/{id}',   [TeamMemberController::class, 'destroy'])->middleware('permission:admin');

        // Salary payments
        Route::get   ('salary-payments',        [SalaryPaymentController::class, 'index'])->middleware('permission:admin');
        Route::post  ('salary-payments',        [SalaryPaymentController::class, 'store'])->middleware('permission:admin');
        Route::patch ('salary-payments/{id}',   [SalaryPaymentController::class, 'update'])->middleware('permission:admin');
        Route::delete('salary-payments/{id}',   [SalaryPaymentController::class, 'destroy'])->middleware('permission:admin');

        // Expenses
        Route::get   ('expenses',        [ExpenseController::class, 'index'])->middleware('permission:admin,staff');
        Route::post  ('expenses',        [ExpenseController::class, 'store'])->middleware('permission:admin,staff');
        Route::get   ('expenses/{id}',   [ExpenseController::class, 'show'])->middleware('permission:admin,staff');
        Route::patch ('expenses/{id}',   [ExpenseController::class, 'update'])->middleware('permission:admin,staff');
        Route::put   ('expenses/{id}',   [ExpenseController::class, 'update'])->middleware('permission:admin,staff');
        Route::delete('expenses/{id}',   [ExpenseController::class, 'destroy'])->middleware('permission:admin');

        // Reports (admin/staff)
        Route::get('reports/dashboard', [ReportsController::class, 'dashboard'])->middleware('permission:admin,staff');
        Route::get('reports/finance',   [ReportsController::class, 'finance'])->middleware('permission:admin,staff');
    });

    // Public CRM/KB (no auth)
    Route::post('leads/capture', [LeadController::class, 'capture']);
    Route::get ('kb',            [KbArticleController::class, 'published']);
    Route::get ('kb/{slug}',     [KbArticleController::class, 'showBySlug']);
});
