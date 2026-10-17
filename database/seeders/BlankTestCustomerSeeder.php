<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class BlankTestCustomerSeeder extends Seeder
{
    /**
     * Create a blank test customer with NO pre-filled income data.
     * Login: test@tiqtax.in / Test@1234
     */
    public function run(): void
    {
        $existing = User::where('email', 'test@tiqtax.in')->first();

        if ($existing) {
            $this->command->info("Test customer already exists. ID: {$existing->id}");
            $this->command->info("Email   : test@tiqtax.in");
            $this->command->info("Password: Test@1234");
            return;
        }

        $user = User::create([
            'name'     => 'Test Customer',
            'email'    => 'test@tiqtax.in',
            'phone'    => '9000000001',
            'password' => Hash::make('Test@1234'),
        ]);

        $this->command->info("✅ Blank test customer created!");
        $this->command->info("User ID : {$user->id}");
        $this->command->info("Email   : test@tiqtax.in");
        $this->command->info("Password: Test@1234");
    }
}
