<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleUsersSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@cataxportal.com'],
            [
                'name' => 'CA Principal Partner (Admin)',
                'phone' => '9820011223',
                'password' => Hash::make('admin123'),
                'role' => 'admin',
            ]
        );
        $admin->update(['role' => 'admin']);

        $emp1 = User::firstOrCreate(
            ['email' => 'rahul.ca@cataxportal.com'],
            [
                'name' => 'CA Rahul Sharma (Tax Associate)',
                'phone' => '9811223344',
                'password' => Hash::make('employee123'),
                'role' => 'employee',
            ]
        );
        $emp1->update(['role' => 'employee']);

        $emp2 = User::firstOrCreate(
            ['email' => 'sneha.ca@cataxportal.com'],
            [
                'name' => 'CA Sneha Patil (Senior Filing Specialist)',
                'phone' => '9899887766',
                'password' => Hash::make('employee123'),
                'role' => 'employee',
            ]
        );
        $emp2->update(['role' => 'employee']);
    }
}
