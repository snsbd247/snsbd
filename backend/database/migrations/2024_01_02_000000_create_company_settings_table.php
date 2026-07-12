<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_settings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('company_name');
            $table->string('logo_url')->nullable();
            $table->string('favicon_url')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->text('address')->nullable();
            $table->string('website')->nullable();
            $table->string('facebook_url')->nullable();
            $table->text('footer_copyright')->nullable();
            $table->decimal('late_fee_percent', 5, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_settings');
    }
};
