<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ais_connections', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider')->default('mock'); // 'mock' | 'real' (ERI partner name)
            $table->string('status')->default('pending'); // pending|connected|expired|revoked|failed
            $table->string('connection_reference')->nullable(); // opaque token from ERI partner, NEVER a password
            $table->string('assessment_year', 9)->nullable(); // e.g. 2026-27
            $table->timestamp('connected_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ais_connections');
    }
};
