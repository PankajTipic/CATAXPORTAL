<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agent_requests', function (Blueprint $table) {
            // Pipeline status in strict sequence:
            // request_received -> under_review -> documents_pending -> govt_portal_check
            // -> data_fetching -> comparison -> deductions_regime -> file_prepared
            // -> payment_pending -> customer_approval -> changes_requested -> submitted -> completed
            if (!Schema::hasColumn('agent_requests', 'pipeline_status')) {
                $table->string('pipeline_status', 40)->default('request_received')->after('status')->index();
            }
            if (!Schema::hasColumn('agent_requests', 'onboarding_complete')) {
                $table->boolean('onboarding_complete')->default(false)->after('pipeline_status');
            }
            if (!Schema::hasColumn('agent_requests', 'itr_portal_registered')) {
                $table->boolean('itr_portal_registered')->nullable()->after('onboarding_complete');
            }
            if (!Schema::hasColumn('agent_requests', 'payment_status')) {
                $table->string('payment_status', 20)->default('unpaid')->after('itr_portal_registered')->index();
            }
            if (!Schema::hasColumn('agent_requests', 'payment_id')) {
                $table->string('payment_id', 100)->nullable()->after('payment_status');
            }
            if (!Schema::hasColumn('agent_requests', 'paid_at')) {
                $table->timestamp('paid_at')->nullable()->after('payment_id');
            }
            if (!Schema::hasColumn('agent_requests', 'customer_change_request')) {
                $table->text('customer_change_request')->nullable()->after('paid_at');
            }
            if (!Schema::hasColumn('agent_requests', 'submitted_by_role')) {
                $table->string('submitted_by_role', 30)->nullable()->after('customer_change_request');
            }
            if (!Schema::hasColumn('agent_requests', 'submitted_at')) {
                $table->timestamp('submitted_at')->nullable()->after('submitted_by_role');
            }
            if (!Schema::hasColumn('agent_requests', 'acknowledgement_number')) {
                $table->string('acknowledgement_number', 100)->nullable()->after('submitted_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agent_requests', function (Blueprint $table) {
            $table->dropColumn([
                'pipeline_status',
                'onboarding_complete',
                'itr_portal_registered',
                'payment_status',
                'payment_id',
                'paid_at',
                'customer_change_request',
                'submitted_by_role',
                'submitted_at',
                'acknowledgement_number',
            ]);
        });
    }
};
