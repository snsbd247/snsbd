<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // ---------- CRM ----------
        Schema::create('leads', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('name');
            $t->string('email', 191)->nullable();
            $t->string('phone', 64)->nullable();
            $t->string('company')->nullable();
            $t->string('source', 64)->nullable();
            $t->string('status', 32)->default('new'); // new|contacted|qualified|won|lost
            $t->text('notes')->nullable();
            $t->unsignedBigInteger('assigned_to')->nullable();
            $t->timestamps();

            $t->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $t->index('status');
        });

        Schema::create('support_tickets', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('ticket_number', 32)->unique();
            $t->unsignedBigInteger('customer_id');
            $t->unsignedBigInteger('assigned_to')->nullable();
            $t->string('subject');
            $t->string('department', 64)->default('general');
            $t->string('priority', 32)->default('normal');
            $t->enum('status', ['open','pending','answered','closed'])->default('open');
            $t->timestamp('last_reply_at')->nullable();
            $t->timestamps();

            $t->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreign('assigned_to')->references('id')->on('users')->nullOnDelete();
            $t->index(['customer_id', 'status']);
        });

        Schema::create('ticket_replies', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('ticket_id');
            $t->unsignedBigInteger('author_id');
            $t->text('body');
            $t->boolean('is_staff')->default(false);
            $t->timestamps();

            $t->foreign('ticket_id')->references('id')->on('support_tickets')->cascadeOnDelete();
            $t->foreign('author_id')->references('id')->on('users')->cascadeOnDelete();
            $t->index('ticket_id');
        });

        Schema::create('kb_articles', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('slug', 191)->unique();
            $t->string('title');
            $t->string('category', 64)->nullable();
            $t->longText('body');
            $t->boolean('is_published')->default(true);
            $t->integer('sort_order')->default(0);
            $t->unsignedBigInteger('author_id')->nullable();
            $t->timestamps();

            $t->foreign('author_id')->references('id')->on('users')->nullOnDelete();
            $t->index('category');
        });

        // ---------- HR ----------
        Schema::create('team_members', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('user_id')->nullable();
            $t->string('full_name');
            $t->string('email', 191)->nullable();
            $t->string('phone', 64)->nullable();
            $t->string('role', 64)->nullable();
            $t->string('department', 64)->nullable();
            $t->decimal('monthly_salary', 12, 2)->nullable();
            $t->date('joined_at')->nullable();
            $t->boolean('active')->default(true);
            $t->text('notes')->nullable();
            $t->timestamps();

            $t->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });

        Schema::create('salary_payments', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('team_member_id');
            $t->decimal('amount', 12, 2);
            $t->date('paid_at');
            $t->string('period', 32)->nullable(); // e.g. "2026-07"
            $t->string('method', 64)->nullable();
            $t->text('notes')->nullable();
            $t->unsignedBigInteger('recorded_by')->nullable();
            $t->timestamps();

            $t->foreign('team_member_id')->references('id')->on('team_members')->cascadeOnDelete();
            $t->foreign('recorded_by')->references('id')->on('users')->nullOnDelete();
            $t->index(['team_member_id', 'paid_at']);
        });

        Schema::create('expenses', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('title');
            $t->text('description')->nullable();
            $t->decimal('amount', 12, 2);
            $t->string('category', 64)->nullable();
            $t->date('expense_date');
            $t->string('payment_method', 64)->nullable();
            $t->string('receipt_url', 500)->nullable();
            $t->unsignedBigInteger('recorded_by')->nullable();
            $t->timestamps();

            $t->foreign('recorded_by')->references('id')->on('users')->nullOnDelete();
            $t->index('expense_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
        Schema::dropIfExists('salary_payments');
        Schema::dropIfExists('team_members');
        Schema::dropIfExists('kb_articles');
        Schema::dropIfExists('ticket_replies');
        Schema::dropIfExists('support_tickets');
        Schema::dropIfExists('leads');
    }
};
