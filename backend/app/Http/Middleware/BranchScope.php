<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Placeholder for reseller/branch scoping. Extend when reseller module lands.
 */
class BranchScope
{
    public function handle(Request $request, Closure $next): Response
    {
        // Attach reseller/branch context to the request if applicable.
        // $request->attributes->set('branch_id', $request->user()?->reseller_id);
        return $next($request);
    }
}
