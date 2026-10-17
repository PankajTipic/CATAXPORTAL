<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('itd_notices')) {
            Schema::create('itd_notices', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('pan', 10)->index();
                $table->string('assessment_year', 10)->default('2026-27');
                $table->string('notice_din', 100)->unique(); // Document Identification Number
                $table->string('section', 50); // 143(1), 139(9), 142(1), 148, 156, 245, AIS-DISCREPANCY
                $table->string('title');
                $table->text('description');
                $table->date('issue_date');
                $table->date('due_date');
                $table->string('issuing_authority')->default('Centralized Processing Centre (CPC), Bengaluru');
                $table->decimal('demand_amount', 14, 2)->default(0);
                $table->decimal('refund_adjusted', 14, 2)->default(0);
                $table->string('status', 50)->default('pending'); // pending, under_ca_review, response_submitted, closed, rectification_filed
                $table->string('severity', 20)->default('high'); // urgent, high, medium, low
                $table->string('notice_file_path')->nullable();
                $table->string('response_type', 50)->nullable(); // agree, disagree, rectification_154, revised_return, updated_return_itru, ca_assisted
                $table->text('response_remarks')->nullable();
                $table->string('response_file_path')->nullable();
                $table->string('response_ack_number', 100)->nullable();
                $table->timestamp('responded_at')->nullable();
                $table->foreignId('assigned_ca_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('ca_notes')->nullable();
                $table->timestamps();
            });
        }

        // Also extend itr_filings table if needed for filing_type & filing_section
        Schema::table('itr_filings', function (Blueprint $table) {
            if (!Schema::hasColumn('itr_filings', 'filing_type')) {
                $table->string('filing_type', 30)->default('original')->after('itr_form_type'); // original, belated, updated, revised
            }
            if (!Schema::hasColumn('itr_filings', 'filing_section')) {
                $table->string('filing_section', 30)->default('139(1)')->after('filing_type'); // 139(1), 139(4), 139(8A), 139(5)
            }
            if (!Schema::hasColumn('itr_filings', 'late_fee_234f')) {
                $table->decimal('late_fee_234f', 10, 2)->default(0)->after('refund_or_payable');
            }
            if (!Schema::hasColumn('itr_filings', 'itru_additional_tax')) {
                $table->decimal('itru_additional_tax', 10, 2)->default(0)->after('late_fee_234f');
            }
            if (!Schema::hasColumn('itr_filings', 'itru_reason')) {
                $table->string('itru_reason')->nullable()->after('itru_additional_tax');
            }
        });

        // Also extend agent_requests for filing_type
        Schema::table('agent_requests', function (Blueprint $table) {
            if (!Schema::hasColumn('agent_requests', 'filing_type')) {
                $table->string('filing_type', 30)->default('original')->after('itr_form_type');
            }
            if (!Schema::hasColumn('agent_requests', 'notice_id')) {
                $table->unsignedBigInteger('notice_id')->nullable()->after('filing_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('agent_requests', function (Blueprint $table) {
            $table->dropColumn(['filing_type', 'notice_id']);
        });

        Schema::table('itr_filings', function (Blueprint $table) {
            $table->dropColumn(['filing_type', 'filing_section', 'late_fee_234f', 'itru_additional_tax', 'itru_reason']);
        });

        Schema::dropIfExists('itd_notices');
    }
};
