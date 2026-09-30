<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ais_data_snapshots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ais_connection_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('assessment_year', 9);
            $table->json('salary_data')->nullable();
            $table->json('tds_data')->nullable();
            $table->json('interest_income_data')->nullable();
            $table->json('other_income_data')->nullable();
            $table->json('sft_data')->nullable(); // Specified Financial Transactions
            $table->json('raw_response')->nullable(); // full raw payload for audit
            $table->timestamp('fetched_at');
            $table->timestamps();

            $table->unique(['user_id', 'assessment_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ais_data_snapshots');
    }
};
