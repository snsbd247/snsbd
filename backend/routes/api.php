<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingCatalogController;
use App\Http\Controllers\CustomerOrderController;
use App\Http\Controllers\DomainPricingController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ServiceController;
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
    });
});
