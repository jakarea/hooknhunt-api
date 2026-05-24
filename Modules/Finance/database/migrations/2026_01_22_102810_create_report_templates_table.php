<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('report_templates', function (Blueprint $table) {
            $table->id();

            // Template Information
            $table->string('name')->comment('Template name');
            $table->string('type')->comment('Template type: comparative, ratio, cash_flow, fund_flow, custom');
            $table->text('description')->nullable()->comment('Template description');

            // Template Configuration (JSON)
            $table->json('config')->nullable()->comment('Template configuration and settings');
            $table->json('columns')->nullable()->comment('Default columns for this template');
            $table->json('filters')->nullable()->comment('Default filters');
            $table->json('chart_config')->nullable()->comment('Chart visualization config');

            // Is System Template
            $table->boolean('is_system')->default(false)->comment('Is this a system template?');
            $table->string('category')->nullable()->comment('Category for grouping templates');

            // Status
            $table->boolean('is_active')->default(true)->comment('Is template active?');

            // Audit Trail
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index('type');
            $table->index('is_system');
            $table->index('is_active');
            $table->index('category');
        });

        // Insert default system templates
        DB::table('report_templates')->insert([
            // Comparative Statement Template
            [
                'name' => 'Year-over-Year Comparison',
                'type' => 'comparative',
                'description' => 'Compare financial data across multiple years or periods',
                'config' => json_encode([
                    'show_percentage_change' => true,
                    'show_absolute_change' => true,
                    'comparison_periods' => 2,
                ]),
                'columns' => json_encode([
                    ['field' => 'account_name', 'label' => 'Account', 'width' => 200],
                    ['field' => 'current_period', 'label' => 'Current Period', 'width' => 150, 'align' => 'right'],
                    ['field' => 'previous_period', 'label' => 'Previous Period', 'width' => 150, 'align' => 'right'],
                    ['field' => 'change', 'label' => 'Change', 'width' => 120, 'align' => 'right'],
                    ['field' => 'change_percent', 'label' => '% Change', 'width' => 120, 'align' => 'right'],
                ]),
                'is_system' => true,
                'category' => 'Comparative',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // Ratio Analysis Template
            [
                'name' => 'Financial Ratios Analysis',
                'type' => 'ratio',
                'description' => 'Key financial ratios for liquidity, profitability, solvency, and efficiency',
                'config' => json_encode([
                    'include_liquidity' => true,
                    'include_profitability' => true,
                    'include_solvency' => true,
                    'include_efficiency' => true,
                ]),
                'columns' => json_encode([
                    ['field' => 'ratio_name', 'label' => 'Ratio', 'width' => 250],
                    ['field' => 'value', 'label' => 'Value', 'width' => 120, 'align' => 'right'],
                    ['field' => 'previous_value', 'label' => 'Previous', 'width' => 120, 'align' => 'right'],
                    ['field' => 'benchmark', 'label' => 'Benchmark', 'width' => 120, 'align' => 'right'],
                    ['field' => 'status', 'label' => 'Status', 'width' => 100],
                ]),
                'is_system' => true,
                'category' => 'Ratio Analysis',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // Cash Flow Template
            [
                'name' => 'Cash Flow Projection',
                'type' => 'cash_flow',
                'description' => 'Project cash flows based on historical data and forecasts',
                'config' => json_encode([
                    'projection_periods' => 12,
                    'include_operating' => true,
                    'include_investing' => true,
                    'include_financing' => true,
                ]),
                'columns' => json_encode([
                    ['field' => 'category', 'label' => 'Category', 'width' => 200],
                    ['field' => 'actual', 'label' => 'Actual', 'width' => 120, 'align' => 'right'],
                    ['field' => 'projection', 'label' => 'Projection', 'width' => 120, 'align' => 'right'],
                    ['field' => 'variance', 'label' => 'Variance', 'width' => 120, 'align' => 'right'],
                ]),
                'is_system' => true,
                'category' => 'Cash Flow',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // Fund Flow Template
            [
                'name' => 'Fund Flow Statement',
                'type' => 'fund_flow',
                'description' => 'Track sources and uses of funds during a period',
                'config' => json_encode([
                    'show_working_capital' => true,
                    'show_fixed_assets' => true,
                    'show_long_term_debt' => true,
                ]),
                'columns' => json_encode([
                    ['field' => 'item', 'label' => 'Item', 'width' => 250],
                    ['field' => 'amount', 'label' => 'Amount', 'width' => 150, 'align' => 'right'],
                    ['field' => 'percentage', 'label' => '% of Total', 'width' => 120, 'align' => 'right'],
                ]),
                'is_system' => true,
                'category' => 'Fund Flow',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],

            // Custom Report Template
            [
                'name' => 'Custom Report Builder',
                'type' => 'custom',
                'description' => 'Build custom reports with selected data points',
                'config' => json_encode([
                    'allow_custom_columns' => true,
                    'allow_custom_filters' => true,
                    'allow_charting' => true,
                ]),
                'columns' => json_encode([]),
                'is_system' => true,
                'category' => 'Custom',
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_templates');
    }
};
