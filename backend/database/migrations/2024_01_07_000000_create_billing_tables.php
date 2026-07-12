<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('customer_id');
            $table->string('invoice_number', 64)->unique();
            $table->unsignedBigInteger('project_id')->nullable();
            $table->date('issue_date')->useCurrent();
            $table->date('due_date')->nullable();
            $table->decimal('subtotal', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('late_fee', 12, 2)->default(0);
            $table->timestamp('late_fee_applied_at')->nullable();
            $table->enum('status', ['draft','sent','paid','partial','overdue','cancelled'])->default('draft');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('invoice_id');
            $table->unsignedBigInteger('service_id')->nullable();
            $table->text('description');
            $table->decimal('quantity', 10, 2)->default(1);
            $table->decimal('unit_price', 12, 2)->default(0);
            $table->decimal('total', 12, 2)->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('service_id')->references('id')->on('services')->onDelete('set null');
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('invoice_id');
            $table->decimal('amount', 12, 2);
            $table->date('paid_at')->useCurrent();
            $table->string('method', 32)->nullable();
            $table->string('reference')->nullable();
            $table->string('receipt_number', 64)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
        });

        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->enum('provider', ['bkash','nagad','rocket','sslcommerz','stripe','manual']);
            $table->enum('mode', ['sandbox','live'])->default('sandbox');
            $table->string('app_key')->nullable();
            $table->string('app_secret')->nullable();
            $table->string('username')->nullable();
            $table->string('password')->nullable();
            $table->string('merchant_number')->nullable();
            $table->json('extra');
            $table->boolean('is_active')->default(false);
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('invoice_id');
            $table->unsignedBigInteger('customer_id');
            $table->enum('provider', ['bkash','nagad','rocket','sslcommerz','stripe','manual']);
            $table->decimal('amount', 12, 2);
            $table->string('provider_payment_id')->nullable();
            $table->string('provider_trx_id')->nullable();
            $table->enum('status', ['initiated','pending','success','failed','cancelled'])->default('initiated');
            $table->json('raw_response')->nullable();
            $table->timestamps();

            $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('payment_gateways');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
    }
};
