<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('full_name');
            $table->string('email')->nullable();
            $table->string('phone', 32)->nullable();
            $table->string('role', 64)->nullable();
            $table->decimal('monthly_salary', 12, 2)->default(0);
            $table->date('joined_at')->nullable();
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('leads', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name')->nullable();
            $table->string('email');
            $table->string('phone', 32)->nullable();
            $table->string('subject')->nullable();
            $table->text('message')->nullable();
            $table->string('source', 32)->default('contact');
            $table->string('plan_name')->nullable();
            $table->string('status', 32)->default('new');
            $table->text('notes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();
        });

        Schema::create('salary_payments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('team_member_id');
            $table->decimal('amount', 12, 2);
            $table->string('pay_period', 32);
            $table->date('paid_at')->useCurrent();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('team_member_id')->references('id')->on('team_members')->onDelete('cascade');
        });

        Schema::create('expenses', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->enum('category', ['office','salary','marketing','software','hardware','utilities','other'])->default('other');
            $table->text('description');
            $table->decimal('amount', 12, 2);
            $table->date('expense_date')->useCurrent();
            $table->string('vendor')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('salary_payments');
        Schema::dropIfExists('leads');
        Schema::dropIfExists('team_members');
    }
};
