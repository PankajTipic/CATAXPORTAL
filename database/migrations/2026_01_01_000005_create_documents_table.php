<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('assessment_year', 9);
            $table->enum('type', ['form16', 'form26as', 'salary_slip', 'investment_proof', 'other']);
            $table->string('original_filename');
            $table->string('stored_path'); // storage/app path, never publicly exposed directly
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes');
            $table->string('checksum_sha256', 64);
            $table->enum('status', ['uploaded', 'scanning', 'clean', 'rejected', 'parsed'])->default('uploaded');
            $table->json('parsed_data')->nullable(); // extracted fields once parsed
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
