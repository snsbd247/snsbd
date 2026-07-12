<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\UserCustomRole;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Accepts either email or username in the "login" field.
     */
    public function login(Request $request)
    {
        $data = $request->validate([
            'login' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['login'])
            ->orWhere('username', $data['login'])
            ->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'login' => ['Invalid credentials.'],
            ]);
        }

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user' => $user,
            'roles' => $user->customRoles()->pluck('role'),
            'token' => $token,
        ]);
    }

    /**
     * POST /api/auth/register
     * First registered user becomes admin, everyone else = customer.
     */
    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'required|string|max:64|unique:users,username',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:8',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'email' => $data['email'],
            'password' => $data['password'], // auto-hashed via cast
        ]);

        $role = User::count() === 1 ? 'admin' : 'customer';
        UserCustomRole::create(['user_id' => $user->id, 'role' => $role]);

        $token = $user->createToken('api')->plainTextToken;

        return response()->json([
            'user' => $user,
            'roles' => [$role],
            'token' => $token,
        ], 201);
    }

    /** GET /api/auth/me */
    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'user' => $user,
            'roles' => $user->customRoles()->pluck('role'),
        ]);
    }

    /** POST /api/auth/logout */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['ok' => true]);
    }
}
