<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Audit trail for every status change
        if (!Schema::hasTable('agent_request_status_history')) {
            Schema::create('agent_request_status_history', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agent_request_id')->constrained('agent_requests')->cascadeOnDelete();
                $table->string('from_status', 40)->nullable();
                $table->string('to_status', 40);
                $table->foreignId('changed_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('changed_by_role', 30)->nullable();
                $table->text('notes')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 2. Missing documents request checklist
        if (!Schema::hasTable('agent_missing_doc_requests')) {
            Schema::create('agent_missing_doc_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agent_request_id')->constrained('agent_requests')->cascadeOnDelete();
                $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->json('checklist'); // e.g. ["Form 16 Part B", "Bank Interest Certificate"]
                $table->text('notes')->nullable();
                $table->string('status', 30)->default('open'); // open, fulfilled, resolved
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();
            });
        }

        // 3. Tax data snapshots (AIS + 26AS raw payloads with timestamps)
        if (!Schema::hasTable('agent_tax_data_snapshots')) {
            Schema::create('agent_tax_data_snapshots', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agent_request_id')->constrained('agent_requests')->cascadeOnDelete();
                $table->string('provider', 50)->default('mock');
                $table->string('pan', 10);
                $table->string('assessment_year', 10);
                $table->json('ais_data')->nullable();
                $table->json('form26as_data')->nullable();
                $table->timestamp('fetched_at')->useCurrent();
                $table->string('status', 30)->default('success'); // success, failed, partial
                $table->text('error_message')->nullable();
                $table->timestamps();
            });
        }

        // 4. Data mismatches table (AIS vs 26AS vs Form 16 comparison items)
        if (!Schema::hasTable('agent_data_mismatches')) {
            Schema::create('agent_data_mismatches', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agent_request_id')->constrained('agent_requests')->cascadeOnDelete();
                $table->foreignId('snapshot_id')->nullable()->constrained('agent_tax_data_snapshots')->nullOnDelete();
                $table->string('category', 50); // salary, tds, interest, dividend, other
                $table->string('item_name', 150)->nullable();
                $table->decimal('ais_amount', 14, 2)->default(0);
                $table->decimal('form26as_amount', 14, 2)->default(0);
                $table->decimal('customer_doc_amount', 14, 2)->default(0);
                $table->string('resolution', 40)->nullable(); // accept_ais, accept_form16, ask_customer, manual_override
                $table->text('resolution_notes')->nullable();
                $table->foreignId('resolved_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamp('resolved_at')->nullable();
                $table->timestamps();
            });
        }

        // 5. Dual-regime results table
        if (!Schema::hasTable('agent_regime_results')) {
            Schema::create('agent_regime_results', function (Blueprint $table) {
                $table->id();
                $table->foreignId('agent_request_id')->constrained('agent_requests')->cascadeOnDelete();
                $table->decimal('gross_income', 14, 2)->default(0);
                $table->json('deductions_old')->nullable();
                $table->json('deductions_new')->nullable();
                $table->decimal('tax_old_regime', 14, 2)->default(0);
                $table->decimal('tax_new_regime', 14, 2)->default(0);
                $table->string('recommended_regime', 10)->default('new'); // old, new
                $table->string('final_regime', 10)->nullable();
                $table->decimal('savings', 14, 2)->default(0);
                $table->json('computation_sheet')->nullable();
                $table->foreignId('prepared_by_user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_regime_results');
        Schema::dropIfExists('agent_data_mismatches');
        Schema::dropIfExists('agent_tax_data_snapshots');
        Schema::dropIfExists('agent_missing_doc_requests');
        Schema::dropIfExists('agent_request_status_history');
    }
};
