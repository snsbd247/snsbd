<?php

use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment('Sync ideas. Ship them.');
})->purpose('Display an inspiring quote');
