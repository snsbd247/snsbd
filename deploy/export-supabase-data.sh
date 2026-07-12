#!/usr/bin/env bash
# =============================================================================
# Supabase → MySQL data migration helper
#
# ধাপ ১: Supabase থেকে CSV export (এই script)
# ধাপ ২: VPS-এ upload
# ধাপ ৩: Laravel-এ import: php artisan snsbd:import-supabase /path/to/csv-dir
# =============================================================================
set -euo pipefail

# Lovable Cloud → Advanced Settings → Export data থেকে সব CSV download করুন,
# একটি folder-এ রাখুন (উদাহরণ: ./supabase-export/), তারপর VPS-এ scp করুন:
#
#   scp -r supabase-export/ root@syncsolutionbd.com:/tmp/snsbd-import/
#
# তারপর VPS-এ:
#
#   cd /var/www/snsbd/backend
#   php artisan snsbd:import-supabase /tmp/snsbd-import
#
# Import order (dependency-safe):
#   1. profiles → users
#   2. user_roles → user_custom_roles
#   3. company_settings
#   4. hosting_packages, domain_pricing, whm_servers, service_catalog
#   5. team_members, leads
#   6. projects → project_milestones → project_activity_log
#   7. customer_orders → services → service_package_changes
#   8. invoices → invoice_items → payments → payment_transactions
#   9. payment_gateways, expenses, salary_payments

echo "Supabase data export instructions:"
echo ""
echo "1. Lovable-এ যান: Cloud → Advanced Settings → Export data"
echo "2. সব table CSV হিসেবে download করুন একটি folder-এ"
echo "3. Folder-টি VPS-এ upload করুন:"
echo "     scp -r supabase-export/ root@YOUR_VPS_IP:/tmp/snsbd-import/"
echo "4. VPS-এ import command চালান:"
echo "     cd /var/www/snsbd/backend"
echo "     php artisan snsbd:import-supabase /tmp/snsbd-import"
