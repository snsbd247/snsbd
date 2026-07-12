<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('customer_id');
            $table->enum('type', ['domain','hosting','ssl','email','other'])->default('hosting');
            $table->string('name');
            $table->text('details')->nullable();
            $table->date('purchase_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->decimal('cost_price', 12, 2)->default(0);
            $table->decimal('sale_price', 12, 2)->default(0);
            $table->enum('status', ['active','suspended','expired','cancelled'])->default('active');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('project_id')->nullable();
            $table->string('registrar')->nullable();
            $table->text('nameservers')->nullable();
            $table->text('dns_notes')->nullable();
            $table->unsignedBigInteger('linked_hosting_id')->nullable();
            $table->boolean('renewable')->default(false);
            $table->timestamp('last_renewal_invoice_at')->nullable();
            $table->string('cpanel_url')->nullable();
            $table->string('cpanel_username')->nullable();
            $table->text('cpanel_password')->nullable();
            $table->unsignedBigInteger('hosting_package_id')->nullable();
            $table->unsignedBigInteger('whm_server_id')->nullable();
            $table->string('whm_account_user')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('hosting_package_id')->references('id')->on('hosting_packages')->onDelete('set null');
            $table->foreign('whm_server_id')->references('id')->on('whm_servers')->onDelete('set null');
            $table->foreign('project_id')->references('id')->on('projects')->onDelete('set null');
        });

        Schema::create('service_package_changes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('service_id');
            $table->unsignedBigInteger('old_package_id')->nullable();
            $table->unsignedBigInteger('new_package_id')->nullable();
            $table->string('old_package_name')->nullable();
            $table->string('new_package_name')->nullable();
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('service_id')->references('id')->on('services')->onDelete('cascade');
        });

        Schema::create('customer_orders', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('customer_id');
            $table->enum('order_type', ['hosting','domain','service','custom'])->default('hosting');
            $table->unsignedBigInteger('hosting_package_id')->nullable();
            $table->unsignedBigInteger('service_catalog_id')->nullable();
            $table->string('domain_name')->nullable();
            $table->enum('domain_action', ['register','transfer','existing'])->nullable();
            $table->decimal('quoted_price', 12, 2)->default(0);
            $table->enum('status', ['pending','verified','active','rejected','cancelled'])->default('pending');
            $table->string('billing_cycle', 32)->nullable();
            $table->string('payment_method', 32)->nullable();
            $table->string('manual_trx_id')->nullable();
            $table->string('manual_sender')->nullable();
            $table->text('customer_notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->unsignedBigInteger('activated_service_id')->nullable();
            $table->unsignedBigInteger('whm_server_id')->nullable();
            $table->timestamps();

            $table->foreign('customer_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('hosting_package_id')->references('id')->on('hosting_packages')->onDelete('set null');
            $table->foreign('service_catalog_id')->references('id')->on('service_catalog')->onDelete('set null');
            $table->foreign('whm_server_id')->references('id')->on('whm_servers')->onDelete('set null');
            $table->foreign('activated_service_id')->references('id')->on('services')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_orders');
        Schema::dropIfExists('service_package_changes');
        Schema::dropIfExists('services');
    }
};
