<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Supabase CSV → MySQL importer.
 *
 * Usage: php artisan snsbd:import-supabase /path/to/csv-dir
 *
 * CSV file names must match Supabase table names, e.g.:
 *   profiles.csv, user_roles.csv, company_settings.csv, hosting_packages.csv, ...
 *
 * UUID PKs from Supabase are stored as an `external_uuid` column on each row,
 * used to remap FK relationships during import. MySQL rows use BIGINT PKs.
 */
class ImportSupabaseData extends Command
{
    protected $signature = 'snsbd:import-supabase {dir : Path to folder containing CSV exports}';
    protected $description = 'Import Supabase CSV export into MySQL';

    /** map: table => (uuid => bigint id) */
    private array $idMap = [];

    public function handle(): int
    {
        $dir = rtrim($this->argument('dir'), '/');
        if (! is_dir($dir)) {
            $this->error("Directory not found: $dir");
            return 1;
        }

        // Dependency-safe import order
        $tables = [
            'profiles', 'user_roles', 'company_settings',
            'hosting_packages', 'domain_pricing', 'whm_servers', 'service_catalog',
            'team_members', 'leads',
            'projects', 'project_milestones', 'project_activity_log',
            'customer_orders', 'services', 'service_package_changes',
            'invoices', 'invoice_items', 'payments',
            'payment_gateways', 'payment_transactions',
            'expenses', 'salary_payments',
        ];

        DB::beginTransaction();
        try {
            foreach ($tables as $table) {
                $csv = "$dir/$table.csv";
                if (! file_exists($csv)) {
                    $this->warn("Skipping $table (no CSV found)");
                    continue;
                }
                $this->importTable($table, $csv);
            }
            DB::commit();
            $this->info('✅ Import complete.');
            return 0;
        } catch (\Throwable $e) {
            DB::rollBack();
            $this->error('Import failed: '.$e->getMessage());
            $this->error($e->getTraceAsString());
            return 1;
        }
    }

    private function importTable(string $table, string $csvPath): void
    {
        $this->info("Importing $table ...");

        $fh = fopen($csvPath, 'r');
        $headers = fgetcsv($fh);
        if (! $headers) {
            fclose($fh);
            return;
        }

        $count = 0;
        while (($row = fgetcsv($fh)) !== false) {
            $data = array_combine($headers, $row);
            $this->insertRow($table, $data);
            $count++;
        }
        fclose($fh);

        $this->line("  → $count rows");
    }

    private function insertRow(string $table, array $data): void
    {
        // Custom per-table transforms
        $mysqlTable = match ($table) {
            'profiles' => 'users',
            'user_roles' => 'user_custom_roles',
            default => $table,
        };

        // Skip if MySQL table doesn't exist yet (module not migrated)
        if (! DB::getSchemaBuilder()->hasTable($mysqlTable)) {
            return;
        }

        $row = $this->transformRow($table, $data);
        if (empty($row)) return;

        // Store UUID → BIGINT map for FK remapping
        $originalUuid = $data['id'] ?? null;

        $newId = DB::table($mysqlTable)->insertGetId($row);

        if ($originalUuid) {
            $this->idMap[$table][$originalUuid] = $newId;
            // Also map by MySQL table name for FK lookups
            $this->idMap[$mysqlTable][$originalUuid] = $newId;
        }
    }

    private function transformRow(string $table, array $d): array
    {
        return match ($table) {
            'profiles' => [
                'name' => $d['full_name'] ?? $d['email'] ?? 'User',
                'username' => $d['username'] ?? explode('@', $d['email'] ?? 'user')[0],
                'email' => $d['email'],
                'password' => Hash::make('ChangeMe@123'), // users must reset
                'phone' => $d['phone'] ?? null,
                'avatar_url' => $d['avatar_url'] ?? null,
                'created_at' => $d['created_at'] ?? now(),
                'updated_at' => $d['updated_at'] ?? now(),
            ],
            'user_roles' => [
                'user_id' => $this->idMap['profiles'][$d['user_id']] ?? null,
                'role' => $d['role'],
                'created_at' => now(),
                'updated_at' => now(),
            ],
            'company_settings' => [
                'company_name' => $d['company_name'],
                'logo_url' => $d['logo_url'] ?? null,
                'favicon_url' => $d['favicon_url'] ?? null,
                'email' => $d['email'] ?? null,
                'phone' => $d['phone'] ?? null,
                'address' => $d['address'] ?? null,
                'website' => $d['website'] ?? null,
                'facebook_url' => $d['facebook_url'] ?? null,
                'footer_copyright' => $d['footer_copyright'] ?? null,
                'late_fee_percent' => $d['late_fee_percent'] ?? 0,
                'created_at' => $d['created_at'] ?? now(),
                'updated_at' => $d['updated_at'] ?? now(),
            ],
            // TODO: add transforms for remaining tables as modules are migrated
            default => [],
        };
    }
}
