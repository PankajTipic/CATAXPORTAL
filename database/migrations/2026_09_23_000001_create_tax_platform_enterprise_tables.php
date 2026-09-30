<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tax Rule Sets (Versioned per AY)
        if (!Schema::hasTable('tax_rule_sets')) {
            Schema::create('tax_rule_sets', function (Blueprint $table) {
                $table->id();
                $table->string('assessment_year', 10)->index(); // e.g. 2026-27
                $table->string('version', 20)->default('1.0.0');
                $table->boolean('is_active')->default(true);
                $table->json('rules'); // Slabs, std deduction, 87A rebate, cess, surcharge, deduction limits
                $table->string('notes')->nullable();
                $table->timestamps();
            });
        }

        // 2. Immutable Audit Logs
        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->unsignedBigInteger('case_id')->nullable()->index();
                $table->string('action', 100); // e.g. "DOCUMENT_VERIFIED", "REGIME_CHANGED", "RETURN_PREPARED"
                $table->string('entity_type', 100)->nullable();
                $table->unsignedBigInteger('entity_id')->nullable();
                $table->json('before_state')->nullable();
                $table->json('after_state')->nullable();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 3. User Consent Records (DPDP / ITD compliance)
        if (!Schema::hasTable('consent_records')) {
            Schema::create('consent_records', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('pan', 10)->index();
                $table->string('consent_type', 50); // "AIS_FETCH", "DECLARATION", "CA_AUTHORIZATION"
                $table->text('consent_text');
                $table->string('ip_address', 45)->nullable();
                $table->timestamp('created_at')->useCurrent();
            });
        }

        // 4. Extend agent_requests (CA Cases) with enterprise workflow fields
        Schema::table('agent_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('agent_requests', 'itr_form_type')) {
                $table->string('itr_form_type', 10)->default('ITR-1')->after('service_type');
            }
            if (!Schema::hasColumn('agent_requests', 'chosen_regime')) {
                $table->string('chosen_regime', 10)->default('new')->after('itr_form_type');
            }
            if (!Schema::hasColumn('agent_requests', 'reviewer_id')) {
                $table->foreignId('reviewer_id')->nullable()->after('assigned_employee_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('agent_requests', 'quality_gate_passed')) {
                $table->boolean('quality_gate_passed')->default(false)->after('reviewer_id');
            }
            if (!Schema::hasColumn('agent_requests', 'customer_approved')) {
                $table->boolean('customer_approved')->default(false)->after('quality_gate_passed');
            }
            if (!Schema::hasColumn('agent_requests', 'customer_approved_at')) {
                $table->timestamp('customer_approved_at')->nullable()->after('customer_approved');
            }
            if (!Schema::hasColumn('agent_requests', 'return_draft')) {
                $table->json('return_draft')->nullable()->after('details');
            }
            if (!Schema::hasColumn('agent_requests', 'tax_summary')) {
                $table->json('tax_summary')->nullable()->after('return_draft');
            }
            if (!Schema::hasColumn('agent_requests', 'acknowledgement_number')) {
                $table->string('acknowledgement_number', 100)->nullable()->after('tax_summary');
            }
        });

        // 5. Extend documents table for CA verification & rejection reasons
        Schema::table('documents', function (Blueprint $table) {
            if (!Schema::hasColumn('documents', 'category')) {
                $table->string('category', 50)->nullable()->after('type');
            }
            if (!Schema::hasColumn('documents', 'rejection_reason')) {
                $table->text('rejection_reason')->nullable()->after('parsed_data');
            }
            if (!Schema::hasColumn('documents', 'verified_by')) {
                $table->foreignId('verified_by')->nullable()->after('rejection_reason')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('documents', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('verified_by');
            }
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropColumn(['category', 'rejection_reason', 'verified_by', 'verified_at']);
        });

        Schema::table('agent_requests', function (Blueprint $table) {
            $table->dropColumn([
                'itr_form_type',
                'chosen_regime',
                'reviewer_id',
                'quality_gate_passed',
                'customer_approved',
                'customer_approved_at',
                'return_draft',
                'tax_summary',
                'acknowledgement_number',
            ]);
        });

        Schema::dropIfExists('consent_records');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('tax_rule_sets');
    }
};
