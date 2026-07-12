<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CompanySettingsController extends Controller
{
    /** GET /api/company-settings — public */
    public function show()
    {
        return response()->json(CompanySetting::current());
    }

    /** PUT /api/company-settings — admin only */
    public function update(Request $request)
    {
        $data = $request->validate([
            'company_name' => 'sometimes|required|string|max:255',
            'logo_url' => 'nullable|string|max:1024',
            'favicon_url' => 'nullable|string|max:1024',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:32',
            'address' => 'nullable|string',
            'website' => 'nullable|string|max:255',
            'facebook_url' => 'nullable|string|max:255',
            'footer_copyright' => 'nullable|string',
            'late_fee_percent' => 'nullable|numeric|min:0|max:100',
        ]);

        $settings = CompanySetting::current();
        $settings->update($data);

        return response()->json($settings);
    }

    /** POST /api/company-settings/logo — admin, multipart upload */
    public function uploadLogo(Request $request)
    {
        $request->validate([
            'file' => 'required|image|mimes:png,jpg,jpeg,svg,webp|max:2048',
            'field' => 'nullable|in:logo_url,favicon_url',
        ]);

        $field = $request->input('field', 'logo_url');
        $path = $request->file('file')->store('logos', 'public');
        $url = Storage::url($path);

        $settings = CompanySetting::current();
        $settings->update([$field => $url]);

        return response()->json(['url' => $url, 'settings' => $settings]);
    }
}
