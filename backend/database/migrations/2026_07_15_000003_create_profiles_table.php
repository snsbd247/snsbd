<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('user_id')->unique();
            $t->string('email', 191);
            $t->string('full_name')->nullable();
            $t->string('username', 64)->nullable()->unique();
            $t->string('phone', 32)->nullable();
            $t->string('company')->nullable();
            $t->string('avatar_url', 500)->nullable();
            $t->string('address')->nullable();
            $t->string('city', 128)->nullable();
            $t->string('country', 128)->nullable();
            $t->string('referral_code', 16)->nullable()->unique();
            $t->timestamps();

            $t->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
