<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BillingCatalogController;
use App\Http\Controllers\InvoiceController;
use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Public
    Route::post('auth/login',    [AuthController::class, 'login']);
    Route::post('auth/register', [AuthController::class, 'register']);

    // Public catalog reads
    Route::get('currencies',        [BillingCatalogController::class, 'currencies']);
    Route::get('invoice-templates', [BillingCatalogController::class, 'templates']);
    Route::get('payment-gateways',  [BillingCatalogController::class, 'gateways']);

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
    });
});
