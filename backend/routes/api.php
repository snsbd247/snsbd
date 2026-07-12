<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CompanySettingsController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

// Company settings — public read, admin write
Route::get('company-settings', [CompanySettingsController::class, 'show']);
Route::middleware(['auth:sanctum', 'permission:admin'])->group(function () {
    Route::put('company-settings', [CompanySettingsController::class, 'update']);
    Route::post('company-settings/logo', [CompanySettingsController::class, 'uploadLogo']);
});

