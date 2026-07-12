<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\DomainPricingController;
use App\Http\Controllers\ExpenseController;
use App\Http\Controllers\HostingPackageController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\InvoiceItemController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PaymentGatewayController;
use App\Http\Controllers\PaymentTransactionController;
use App\Http\Controllers\ProjectActivityLogController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\ProjectMilestoneController;
use App\Http\Controllers\SalaryPaymentController;
use App\Http\Controllers\ServiceCatalogController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\ServicePackageChangeController;
use App\Http\Controllers\TeamMemberController;
use App\Http\Controllers\WhmServerController;
use Illuminate\Support\Facades\Route;

/* ---------------- Auth ---------------- */
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

/* ---------------- Public reads (marketing site) ---------------- */
Route::get('company-settings', [CompanySettingsController::class, 'show']);
Route::get('hosting-packages', [HostingPackageController::class, 'index']);
Route::get('hosting-packages/{id}', [HostingPackageController::class, 'show']);
Route::get('domain-pricing', [DomainPricingController::class, 'index']);
Route::get('service-catalog', [ServiceCatalogController::class, 'index']);
Route::get('team-members', [TeamMemberController::class, 'index']);

/* ---------------- Admin-only ---------------- */
Route::middleware(['auth:sanctum', 'permission:admin'])->group(function () {
    // Company settings
    Route::put('company-settings', [CompanySettingsController::class, 'update']);
    Route::post('company-settings/logo', [CompanySettingsController::class, 'uploadLogo']);

    // Hosting packages (full CRUD)
    Route::post('hosting-packages', [HostingPackageController::class, 'store']);
    Route::put('hosting-packages/{id}', [HostingPackageController::class, 'update']);
    Route::delete('hosting-packages/{id}', [HostingPackageController::class, 'destroy']);

    // Domain pricing
    Route::post('domain-pricing', [DomainPricingController::class, 'store']);
    Route::put('domain-pricing/{id}', [DomainPricingController::class, 'update']);
    Route::delete('domain-pricing/{id}', [DomainPricingController::class, 'destroy']);

    // Generic resources — full CRUD via ApiResource
    Route::apiResource('whm-servers', WhmServerController::class);
    Route::apiResource('service-catalog', ServiceCatalogController::class)->except(['index']);
    Route::apiResource('team-members', TeamMemberController::class)->except(['index']);
    Route::apiResource('leads', LeadController::class);
    Route::apiResource('salary-payments', SalaryPaymentController::class);
    Route::apiResource('expenses', ExpenseController::class);
    Route::apiResource('projects', ProjectController::class);
    Route::apiResource('project-milestones', ProjectMilestoneController::class);
    Route::apiResource('project-activity-logs', ProjectActivityLogController::class);
    Route::apiResource('services', ServiceController::class);
    Route::apiResource('service-package-changes', ServicePackageChangeController::class);
    Route::apiResource('customer-orders', CustomerOrderController::class);
    Route::apiResource('invoices', InvoiceController::class);
    Route::apiResource('invoice-items', InvoiceItemController::class);
    Route::apiResource('payments', PaymentController::class);
    Route::apiResource('payment-gateways', PaymentGatewayController::class);
    Route::apiResource('payment-transactions', PaymentTransactionController::class);
});
