<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form16_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->string('assessment_year', 9);
            $table->string('employer_name');
            $table->string('employer_tan', 10)->nullable();
            $table->decimal('gross_salary', 14, 2)->default(0);
            $table->decimal('standard_deduction', 14, 2)->default(0);
            $table->decimal('hra_exemption', 14, 2)->default(0);
            $table->decimal('professional_tax', 14, 2)->default(0);
            $table->decimal('total_tds', 14, 2)->default(0);
            $table->decimal('deduction_80c', 14, 2)->default(0);
            $table->decimal('deduction_80d', 14, 2)->default(0);
            $table->enum('source', ['manual', 'uploaded_parsed'])->default('manual');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form16_entries');
    }
};
