<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itr_filings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('assessment_year', 9);
            $table->string('itr_form_type', 10)->nullable(); // ITR-1, ITR-2, etc.
            $table->decimal('total_income', 14, 2)->default(0);
            $table->decimal('total_tax_liability', 14, 2)->default(0);
            $table->decimal('total_tds_claimed', 14, 2)->default(0);
            $table->decimal('refund_or_payable', 14, 2)->default(0); // positive = refund, negative = payable
            $table->enum('status', ['draft', 'ready_for_review', 'submitted_to_eri', 'filed', 'verified', 'failed'])->default('draft');
            $table->string('acknowledgement_number')->nullable();
            $table->json('computation_summary')->nullable();
            $table->timestamp('filed_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'assessment_year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itr_filings');
    }
};
