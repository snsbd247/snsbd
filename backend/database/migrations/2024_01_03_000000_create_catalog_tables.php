<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hosting_packages', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category', 32)->default('web');
            $table->string('tagline')->nullable();
            $table->string('disk_space', 64)->nullable();
            $table->string('bandwidth', 64)->nullable();
            $table->json('features');
            $table->decimal('price', 12, 2)->default(0);
            $table->string('billing_cycle', 32)->default('yearly');
            $table->boolean('featured')->default(false);
            $table->string('badge', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('domain_pricing', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('tld', 32);
            $table->decimal('register_price', 12, 2)->default(0);
            $table->decimal('renew_price', 12, 2)->default(0);
            $table->decimal('transfer_price', 12, 2)->default(0);
            $table->string('currency', 8)->default('BDT');
            $table->boolean('featured')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('whm_servers', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('hostname');
            $table->integer('port')->default(2087);
            $table->string('username')->default('root');
            $table->text('api_token');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_sync_at')->nullable();
            $table->text('last_sync_result')->nullable();
            $table->timestamps();
        });

        Schema::create('service_catalog', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name');
            $table->string('category', 64)->nullable();
            $table->text('description')->nullable();
            $table->decimal('price', 12, 2)->default(0);
            $table->string('billing_cycle', 32)->default('one_time');
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_catalog');
        Schema::dropIfExists('whm_servers');
        Schema::dropIfExists('domain_pricing');
        Schema::dropIfExists('hosting_packages');
    }
};
