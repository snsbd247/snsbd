<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('customer_orders', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('customer_id');
            $t->string('order_type', 32)->default('hosting'); // hosting|domain|service
            $t->unsignedBigInteger('hosting_package_id')->nullable();
            $t->unsignedBigInteger('service_catalog_id')->nullable();
            $t->unsignedBigInteger('whm_server_id')->nullable();
            $t->unsignedBigInteger('activated_service_id')->nullable();
            $t->string('domain_name', 191)->nullable();
            $t->decimal('quoted_price', 12, 2)->default(0);
            $t->string('billing_cycle', 32)->default('monthly');
            $t->enum('status', ['pending', 'processing', 'completed', 'cancelled', 'failed'])->default('pending');
            $t->string('payment_method', 64)->nullable();
            $t->string('manual_trx_id', 128)->nullable();
            $t->string('manual_sender', 128)->nullable();
            $t->text('customer_notes')->nullable();
            $t->text('admin_notes')->nullable();
            $t->timestamps();

            $t->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreign('hosting_package_id')->references('id')->on('hosting_packages')->nullOnDelete();
            $t->foreign('service_catalog_id')->references('id')->on('service_catalog')->nullOnDelete();
            $t->foreign('activated_service_id')->references('id')->on('services')->nullOnDelete();
            $t->index(['customer_id', 'status']);
            $t->index('order_type');
        });

        Schema::create('order_domain_changes', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('order_id');
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->string('old_domain', 191)->nullable();
            $t->string('new_domain', 191)->nullable();
            $t->timestamps();

            $t->foreign('order_id')->references('id')->on('customer_orders')->cascadeOnDelete();
            $t->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $t->index('order_id');
        });

        Schema::create('domain_pricing', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('tld', 32)->unique();
            $t->decimal('register_price', 12, 2)->nullable();
            $t->decimal('renew_price', 12, 2)->nullable();
            $t->decimal('transfer_price', 12, 2)->nullable();
            $t->string('currency', 8)->default('BDT');
            $t->boolean('featured')->default(false);
            $t->boolean('is_active')->default(true);
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('domain_pricing');
        Schema::dropIfExists('order_domain_changes');
        Schema::dropIfExists('customer_orders');
    }
};
