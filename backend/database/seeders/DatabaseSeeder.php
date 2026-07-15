<?php

namespace Database\Seeders;

use App\Models\Profile;
use App\Models\User;
use App\Models\UserCustomRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = 'superadmin@syncsolutionbd.com';

        $user = User::updateOrCreate(
            ['email' => $email],
            ['password' => Hash::make('Admin123')]
        );

        Profile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'email'     => $email,
                'full_name' => 'Super Admin',
                'username'  => 'superadmin',
            ]
        );

        UserCustomRole::updateOrCreate(
            ['user_id' => $user->id, 'role' => 'admin'],
            []
        );
    }
}
