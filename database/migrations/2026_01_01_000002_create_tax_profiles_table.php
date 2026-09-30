<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tax_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('pan', 10)->unique(); // format validated at request layer
            $table->date('date_of_birth');
            $table->enum('assessee_type', ['individual', 'huf', 'firm', 'company', 'other'])->default('individual');
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode', 6)->nullable();
            $table->string('aadhaar_last4', 4)->nullable(); // never store full Aadhaar
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tax_profiles');
    }
};
