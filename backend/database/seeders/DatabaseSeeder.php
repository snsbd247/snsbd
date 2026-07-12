<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserCustomRole;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate(
            ['username' => 'superadmin'],
            [
                'name' => 'Super Admin',
                'email' => 'superadmin@syncsolutionbd.com',
                'password' => 'Admin@123', // hashed via cast
            ]
        );

        UserCustomRole::firstOrCreate([
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);
    }
}
