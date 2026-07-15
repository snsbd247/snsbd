<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('customer_id')->nullable();
            $t->string('name');
            $t->text('description')->nullable();
            $t->string('status', 32)->default('active'); // active|on_hold|completed|cancelled
            $t->string('priority', 32)->default('normal');
            $t->date('start_date')->nullable();
            $t->date('end_date')->nullable();
            $t->decimal('budget', 12, 2)->nullable();
            $t->unsignedBigInteger('manager_id')->nullable();
            $t->json('meta')->nullable();
            $t->timestamps();

            $t->foreign('customer_id')->references('id')->on('users')->nullOnDelete();
            $t->foreign('manager_id')->references('id')->on('users')->nullOnDelete();
            $t->index('status');
        });

        Schema::create('project_milestones', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('project_id');
            $t->string('title');
            $t->text('description')->nullable();
            $t->date('due_date')->nullable();
            $t->boolean('completed')->default(false);
            $t->timestamp('completed_at')->nullable();
            $t->integer('sort_order')->default(0);
            $t->timestamps();

            $t->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $t->index('project_id');
        });

        Schema::create('project_activity_logs', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->unsignedBigInteger('project_id');
            $t->unsignedBigInteger('actor_id')->nullable();
            $t->string('action', 64);
            $t->text('message')->nullable();
            $t->json('details')->nullable();
            $t->timestamp('created_at')->useCurrent();

            $t->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $t->foreign('actor_id')->references('id')->on('users')->nullOnDelete();
            $t->index(['project_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_activity_logs');
        Schema::dropIfExists('project_milestones');
        Schema::dropIfExists('projects');
    }
};
