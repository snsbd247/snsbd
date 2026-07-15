<?php

namespace App\Http\Controllers;

use App\Models\Profile;
use App\Models\User;
use App\Models\UserCustomRole;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'     => 'required|email|unique:users,email',
            'password'  => 'required|string|min:8',
            'full_name' => 'nullable|string|max:255',
            'username'  => 'nullable|string|max:64|unique:profiles,username',
        ]);

        $user = DB::transaction(function () use ($data) {
            $user = User::create([
                'email'    => $data['email'],
                'password' => Hash::make($data['password']),
            ]);

            Profile::create([
                'user_id'   => $user->id,
                'email'     => $data['email'],
                'full_name' => $data['full_name'] ?? $data['email'],
                'username'  => $data['username'] ?? null,
            ]);

            $isFirst = User::count() === 1;
            UserCustomRole::create([
                'user_id' => $user->id,
                'role'    => $isFirst ? 'admin' : 'customer',
            ]);

            return $user;
        });

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user'  => $user->load(['profile', 'roles']),
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'identifier' => 'required|string', // email OR username
            'password'   => 'required|string',
        ]);

        $email = filter_var($data['identifier'], FILTER_VALIDATE_EMAIL)
            ? $data['identifier']
            : optional(Profile::whereRaw('LOWER(username) = ?', [strtolower($data['identifier'])])->first())->email;

        $user = $email ? User::where('email', $email)->first() : null;

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'identifier' => ['Invalid credentials.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user'  => $user->load(['profile', 'roles']),
            'token' => $token,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load(['profile', 'roles']),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['ok' => true]);
    }
}
