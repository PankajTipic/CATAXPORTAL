<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agent_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('assessment_year', 10)->default('2026-27');
            $table->string('status', 30)->default('pending'); // pending, assigned, in_progress, prepared, completed
            $table->string('service_type', 50)->default('full_filing'); // full_filing, review_only, capital_gains, business
            $table->text('notes')->nullable();
            $table->json('details')->nullable();
            $table->foreignId('assigned_employee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('uploaded_file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_requests');
    }
};
