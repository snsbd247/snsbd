<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('hosting_packages', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('name');
            $t->text('description')->nullable();
            $t->string('category', 64)->default('shared');
            $t->string('tagline')->nullable();
            $t->string('disk_space', 64)->nullable();
            $t->string('bandwidth', 64)->nullable();
            $t->json('features');
            $t->decimal('price', 12, 2);
            $t->string('billing_cycle', 32)->default('monthly');
            $t->boolean('is_active')->default(true);
            $t->boolean('featured')->default(false);
            $t->string('badge', 64)->nullable();
            $t->string('whm_package_name', 128)->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('product_addons', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('name');
            $t->text('description')->nullable();
            $t->decimal('price', 12, 2);
            $t->string('billing_cycle', 32)->default('monthly');
            $t->unsignedBigInteger('hosting_package_id')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();

            $t->foreign('hosting_package_id')->references('id')->on('hosting_packages')->nullOnDelete();
        });

        Schema::create('service_catalog', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('name');
            $t->string('category', 64)->nullable();
            $t->text('description')->nullable();
            $t->decimal('price', 12, 2);
            $t->string('billing_cycle', 32)->default('monthly');
            $t->boolean('is_active')->default(true);
            $t->integer('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('services', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('customer_id');
            $t->unsignedBigInteger('hosting_package_id')->nullable();
            $t->unsignedBigInteger('catalog_id')->nullable();
            $t->string('name');
            $t->string('domain', 191)->nullable();
            $t->string('whm_username', 64)->nullable();
            $t->string('type', 64)->default('hosting');
            $t->enum('status', ['pending','active','suspended','terminated','cancelled'])->default('pending');
            $t->decimal('price', 12, 2)->default(0);
            $t->string('billing_cycle', 32)->default('monthly');
            $t->date('start_date')->nullable();
            $t->date('next_due_date')->nullable();
            $t->date('termination_date')->nullable();
            $t->text('notes')->nullable();
            $t->json('meta')->nullable();
            $t->timestamps();

            $t->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreign('hosting_package_id')->references('id')->on('hosting_packages')->nullOnDelete();
            $t->foreign('catalog_id')->references('id')->on('service_catalog')->nullOnDelete();
            $t->index(['customer_id', 'status']);
        });

        Schema::create('service_addons', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('service_id');
            $t->unsignedBigInteger('addon_id');
            $t->decimal('price_snapshot', 12, 2);
            $t->timestamps();

            $t->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
            $t->foreign('addon_id')->references('id')->on('product_addons')->cascadeOnDelete();
            $t->unique(['service_id', 'addon_id']);
        });

        Schema::create('service_events', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('service_id');
            $t->string('status', 64);
            $t->text('message')->nullable();
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->json('metadata')->nullable();
            $t->timestamps();

            $t->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
            $t->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $t->index('service_id');
        });

        Schema::create('service_package_changes', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('service_id');
            $t->unsignedBigInteger('old_package_id')->nullable();
            $t->unsignedBigInteger('new_package_id')->nullable();
            $t->string('old_package_name')->nullable();
            $t->string('new_package_name')->nullable();
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->timestamps();

            $t->foreign('service_id')->references('id')->on('services')->cascadeOnDelete();
            $t->foreign('old_package_id')->references('id')->on('hosting_packages')->nullOnDelete();
            $t->foreign('new_package_id')->references('id')->on('hosting_packages')->nullOnDelete();
            $t->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_package_changes');
        Schema::dropIfExists('service_events');
        Schema::dropIfExists('service_addons');
        Schema::dropIfExists('services');
        Schema::dropIfExists('service_catalog');
        Schema::dropIfExists('product_addons');
        Schema::dropIfExists('hosting_packages');
    }
};
