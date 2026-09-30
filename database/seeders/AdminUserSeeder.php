<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    /**
     * Seed the initial admin user for Ewaree admin panel.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@ewaree.com'],
            [
                'name'     => 'Ewaree Admin',
                'email'    => 'admin@ewaree.com',
                'password' => Hash::make('password123'),
            ]
        );

        $this->command->info('Admin user seeded: admin@ewaree.com / password123');
    }
}
