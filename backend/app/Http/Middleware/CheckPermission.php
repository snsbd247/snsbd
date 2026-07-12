<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: Route::middleware('permission:admin')->group(...);
 *        Route::middleware('permission:admin|staff')->group(...);
 */
class CheckPermission
{
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $allowed = explode('|', $roles);
        $userRoles = $user->customRoles()->pluck('role')->toArray();

        if (! array_intersect($allowed, $userRoles)) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return $next($request);
    }
}
