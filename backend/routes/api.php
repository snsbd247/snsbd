<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanySettingsController;
use App\Http\Controllers\DomainPricingController;
use App\Http\Controllers\HostingPackageController;
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

/* ---------------- Admin-only ---------------- */
Route::middleware(['auth:sanctum', 'permission:admin'])->group(function () {
    // Company settings
    Route::put('company-settings', [CompanySettingsController::class, 'update']);
    Route::post('company-settings/logo', [CompanySettingsController::class, 'uploadLogo']);

    // Hosting packages (full CRUD)
    Route::post('hosting-packages', [HostingPackageController::class, 'store']);
    Route::put('hosting-packages/{id}', [HostingPackageController::class, 'update']);
    Route::delete('hosting-packages/{id}', [HostingPackageController::class, 'destroy']);

    // Domain pricing (full CRUD)
    Route::post('domain-pricing', [DomainPricingController::class, 'store']);
    Route::put('domain-pricing/{id}', [DomainPricingController::class, 'update']);
    Route::delete('domain-pricing/{id}', [DomainPricingController::class, 'destroy']);
});

/*
 * TODO controllers to add (models + migrations already exist):
 *   whm_servers, service_catalog, team_members, leads, salary_payments,
 *   expenses, projects, project_milestones, project_activity_logs,
 *   services, service_package_changes, customer_orders, invoices,
 *   invoice_items, payments, payment_gateways, payment_transactions
 *
 * Extend App\Http\Controllers\ApiCrudController for each — see
 * HostingPackageController.php for a 20-line template.
 */


