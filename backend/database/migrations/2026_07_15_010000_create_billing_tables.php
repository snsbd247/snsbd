<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('currencies', function (Blueprint $t) {
            $t->string('code', 8)->primary();
            $t->string('name');
            $t->string('symbol', 8);
            $t->decimal('rate_to_bdt', 14, 4)->default(1);
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('coupons', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('code', 64)->unique();
            $t->text('description')->nullable();
            $t->decimal('discount_percent', 5, 2)->nullable();
            $t->decimal('discount_amount', 12, 2)->nullable();
            $t->integer('max_uses')->nullable();
            $t->integer('used_count')->default(0);
            $t->timestamp('expires_at')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });

        Schema::create('invoice_templates', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('template_key', 64)->unique();
            $t->string('name');
            $t->text('description')->nullable();
            $t->json('theme');
            $t->boolean('is_default')->default(false);
            $t->boolean('is_active')->default(true);
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('invoices', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('customer_id');
            $t->string('invoice_number', 64)->unique();
            $t->date('issue_date');
            $t->date('due_date')->nullable();
            $t->decimal('subtotal',    12, 2)->default(0);
            $t->decimal('tax',         12, 2)->default(0);
            $t->decimal('discount',    12, 2)->default(0);
            $t->decimal('total',       12, 2)->default(0);
            $t->decimal('amount_paid', 12, 2)->default(0);
            $t->enum('status', ['draft','sent','paid','partial','overdue','cancelled','refunded'])->default('draft');
            $t->string('currency_code', 8)->default('BDT');
            $t->string('template_key', 64)->nullable();
            $t->json('theme_override')->nullable();
            $t->text('notes')->nullable();
            $t->text('terms')->nullable();
            $t->unsignedBigInteger('coupon_id')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();

            $t->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreign('currency_code')->references('code')->on('currencies');
            $t->foreign('coupon_id')->references('id')->on('coupons')->nullOnDelete();
            $t->index(['customer_id', 'status']);
        });

        Schema::create('invoice_items', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('invoice_id');
            $t->unsignedBigInteger('service_id')->nullable();
            $t->text('description');
            $t->decimal('quantity',   12, 2)->default(1);
            $t->decimal('unit_price', 12, 2)->default(0);
            $t->decimal('total',      12, 2)->default(0);
            $t->timestamps();

            $t->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
            $t->index('service_id');
        });

        Schema::create('payment_gateways', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('code', 64)->unique();
            $t->string('name');
            $t->string('provider', 64);
            $t->boolean('is_active')->default(true);
            $t->boolean('is_test_mode')->default(false);
            $t->json('config')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('payments', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('invoice_id');
            $t->unsignedBigInteger('gateway_id')->nullable();
            $t->decimal('amount', 12, 2);
            $t->string('currency_code', 8)->default('BDT');
            $t->enum('status', ['pending','succeeded','failed','refunded'])->default('pending');
            $t->string('reference', 191)->nullable();
            $t->text('notes')->nullable();
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();

            $t->foreign('invoice_id')->references('id')->on('invoices')->cascadeOnDelete();
            $t->foreign('gateway_id')->references('id')->on('payment_gateways')->nullOnDelete();
        });

        Schema::create('payment_transactions', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('payment_id');
            $t->string('provider_ref', 191)->nullable()->unique();
            $t->string('kind', 32)->default('charge'); // charge/refund/adjustment
            $t->decimal('amount', 12, 2);
            $t->string('currency_code', 8)->default('BDT');
            $t->string('status', 32);
            $t->json('payload')->nullable();
            $t->timestamps();

            $t->foreign('payment_id')->references('id')->on('payments')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('payment_gateways');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('invoice_templates');
        Schema::dropIfExists('coupons');
        Schema::dropIfExists('currencies');
    }
};
