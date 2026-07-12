# Go-Live Checklist (বাংলা)

VPS-এ deploy করার আগে এবং পরে এই checklist মিলিয়ে নিন।

---

## ✅ Pre-Deployment (Deploy করার আগে)

### Code
- [ ] সব migrations local MySQL-এ test করা হয়েছে (`php artisan migrate:fresh --seed`)
- [ ] Frontend build সফল (`npm run build` কোনো error ছাড়া)
- [ ] `.env.production.example`-এ `VITE_API_BASE_URL=https://syncsolutionbd.com/api` আছে
- [ ] `backend/.env.example`-এ default values ঠিক আছে
- [ ] Git repo-তে সব push করা হয়েছে (main branch)

### VPS
- [ ] Fresh Ubuntu 22.04/24.04 VPS তৈরি
- [ ] Domain `syncsolutionbd.com` → VPS IP-তে A record set
- [ ] SSH access কাজ করে (root/sudo)
- [ ] 80/443 port firewall-এ open

### Data (যদি migrate করতে হয়)
- [ ] Lovable Cloud → Export data → সব CSV download
- [ ] CSV file names verify: `profiles.csv`, `user_roles.csv`, ...

---

## 🚀 Deployment

```bash
sudo -i
wget https://raw.githubusercontent.com/YOUR_ORG/snsbd/main/deploy/vps/install.sh
DOMAIN=syncsolutionbd.com \
REPO_URL=https://github.com/YOUR_ORG/snsbd.git \
ADMIN_EMAIL=admin@syncsolutionbd.com \
bash install.sh
```

Wait for: `✅ Installation complete!`

Data import (যদি প্রয়োজন):
```bash
scp -r supabase-export/ root@syncsolutionbd.com:/tmp/snsbd-import/
ssh root@syncsolutionbd.com "cd /var/www/snsbd/backend && php artisan snsbd:import-supabase /tmp/snsbd-import"
```

---

## ✅ Post-Deployment (Deploy করার পর)

### Basic Smoke Tests
- [ ] `https://syncsolutionbd.com` browser-এ open হয়
- [ ] SSL certificate valid (browser padlock green)
- [ ] `https://syncsolutionbd.com/api/company-settings` JSON return করে
- [ ] Admin login কাজ করে (`superadmin` / `Admin@123`)
- [ ] Admin panel-এ dashboard load হয়

### Admin Panel Test
- [ ] Company settings update হয়
- [ ] Logo upload কাজ করে (`/storage/logos/...`-এ visible)
- [ ] Hosting package create/edit/delete
- [ ] Domain pricing create/edit/delete

### Marketing Site Test
- [ ] Homepage hosting packages দেখায়
- [ ] Domain pricing page price দেখায়
- [ ] "Order Now" click → login page redirect

### Security
- [ ] `superadmin` password পরিবর্তন করা হয়েছে (`Admin@123` → নতুন strong password)
- [ ] `backend/.env` file permission 600 (`chmod 600 backend/.env`)
- [ ] Migrated users-দের password reset instruction পাঠানো হয়েছে (default: `ChangeMe@123`)
- [ ] MySQL remote access disabled (only 127.0.0.1)
- [ ] Firewall: শুধু 22, 80, 443 open

### Backup
- [ ] MySQL daily backup cron সেটাপ করা হয়েছে
- [ ] `backend/.env` কোথাও safe জায়গায় copy করা হয়েছে (APP_KEY হারালে সব encrypted data unrecoverable)
- [ ] `storage/app/public/logos/` backup-এ include আছে

### Monitoring
- [ ] `tail -f /var/www/snsbd/backend/storage/logs/laravel.log` — কোনো error নেই
- [ ] `sudo journalctl -u nginx -n 100` — clean
- [ ] Disk usage ঠিক আছে (`df -h`)

---

## 📁 What's Already Built vs What's Left

### ✅ Complete (Backend)
- Laravel 11 skeleton + Sanctum auth
- Migrations: all 22 tables (users, roles, company_settings, hosting_packages, domain_pricing, whm_servers, service_catalog, team_members, leads, salary_payments, expenses, projects, project_milestones, project_activity_logs, services, service_package_changes, customer_orders, invoices, invoice_items, payments, payment_gateways, payment_transactions)
- Models: সব table-এর Eloquent model with relationships
- Controllers: Auth, CompanySettings, HostingPackage, DomainPricing (full CRUD)
- Generic `ApiCrudController` base class — বাকি সব admin resource-এর জন্য 20-line subclass লিখলেই CRUD ready

### ✅ Complete (Frontend Bridge)
- `laravel-auth.ts` — API client + token storage
- `laravel-bridge.ts` — dual-mode auth (Laravel or Supabase fallback)
- `company-settings-api.ts` — example wrapper

### ✅ Complete (Deployment)
- `install.sh` one-command VPS installer
- `update.sh` git pull + rebuild
- `SETUP_GUIDE_BN.md`, `LOCAL_TEST_BN.md`, `DATA_MIGRATION_BN.md`
- `ImportSupabaseData` artisan command (transforms for users, roles, company_settings)

### ⏳ Left to Build (per-module, as needed)
1. **Remaining CRUD controllers** (17 modules) — extend `ApiCrudController`, each ~20 lines. Templates in `HostingPackageController.php`.
2. **Frontend API wrappers** — pattern in `src/lib/company-settings-api.ts` — one file per module.
3. **Business logic controllers** — `OrderActivationController` (WHM cPanel create), `PaymentController` (bKash gateway), `InvoiceGeneratorController` — replace TanStack server functions currently in `src/lib/*.functions.ts`.
4. **Additional import transforms** in `ImportSupabaseData.php` for remaining 19 tables (UUID → BIGINT FK remap already done).

### 🎯 Recommended Order for Remaining Work
Once VPS is up and Auth + Company Settings verified working:
1. WHM Servers + Hosting Packages management (admin panel)
2. Customer Orders + Payments (bKash gateway)
3. Order Activation → auto WHM cPanel create
4. Invoices + Invoice Items + Payment tracking
5. Projects + Milestones
6. Team + Salary + Expenses
7. Leads (contact form)

---

## 🆘 Emergency Rollback

কিছু ভেঙে গেলে:

```bash
cd /var/www/snsbd
git log --oneline -20                # last 20 commits
git reset --hard <previous-commit>   # rollback code
bash deploy/vps/update.sh            # rebuild
```

MySQL rollback: শুধু last known good backup restore করুন।

---

সমস্যা হলে: `LOCAL_TEST_BN.md` + `SETUP_GUIDE_BN.md` দেখুন।
