# ধাপ ১ — Migration Plan (শুধু পরিকল্পনা, কোনো ফাইল তৈরি হবে না)

## 🎯 লক্ষ্য পুনরাবৃত্তি
- Frontend: React (Vite) → Laravel-এর `public/` এ build করে serve
- Backend: Laravel 11 + Sanctum token auth
- DB: MySQL 8 (Supabase/PostgreSQL সম্পূর্ণ বাদ)
- Bridge pattern: `VITE_API_BASE_URL` থাকলে Laravel, না থাকলে Supabase fallback → Lovable preview ভাঙবে না

---

## 📊 বর্তমান Supabase Inventory

### Tables (৪৬টি)
```
announcements, api_keys, audit_logs, company_settings, coupons,
currencies, customer_orders, domain_pricing, expenses, hosting_packages,
invoice_items, invoice_templates, invoices, kb_articles, kb_categories,
leads, notifications, order_domain_changes, outbound_webhooks,
page_content_versions, page_contents, payment_gateways,
payment_transactions, payments, product_addons, profiles,
project_activity_log, project_milestones, projects, push_subscriptions,
referral_commissions, reseller_branding, reseller_customers,
reseller_pricing, salary_payments, service_addons, service_catalog,
service_events, service_package_changes, services, support_messages,
support_tickets, team_members, user_roles, webhook_deliveries, whm_servers
```

### DB Functions (Postgres-only, MySQL-এ পোর্ট করতে হবে)
- `is_admin`, `has_role`, `email_for_username` → Laravel service class (`RoleService`)
- `handle_new_user` → Laravel `AuthController@register` + Eloquent observer
- `set_updated_at` → Eloquent `$timestamps = true`
- `notify_user` → Laravel `NotificationService::create()`
- `log_milestone_activity`, `log_service_package_change` → Eloquent observers
- `bump_ticket_on_message` → `SupportMessage` observer (updates parent ticket)
- `notify_invoice_created`, `notify_service_status_change` → observers
- `set_referral_code` → `Profile` boot event
- `notify_support_message` → `SupportMessage` observer

### Storage
- Bucket `marketing-media` → VPS-এ `storage/app/public/marketing-media` + `php artisan storage:link`

### Secrets → Laravel `.env`
```
NAMECHEAP_API_KEY, NAMECHEAP_API_USER, NAMECHEAP_CLIENT_IP,
NAMECHEAP_USERNAME, NAMECHEAP_SANDBOX, LOVABLE_API_KEY,
REGISTRAR_WEBHOOK_SECRET
```
(সব `SUPABASE_*` secrets বাদ যাবে)

---

## 🗺️ Postgres → MySQL Type Mapping

| Postgres | MySQL 8 |
|---|---|
| `uuid` (PK) | `CHAR(36)` PK with `Str::uuid()` in model, অথবা `BIGINT UNSIGNED AUTO_INCREMENT` (recommended for performance) |
| `TEXT` | `TEXT` / `VARCHAR(255)` |
| `JSONB` | `JSON` |
| `TIMESTAMPTZ` | `TIMESTAMP` (UTC saved) |
| `NUMERIC(12,2)` | `DECIMAL(12,2)` |
| `ENUM` (app_role, ticket_status) | MySQL `ENUM(...)` অথবা `VARCHAR` + Laravel Enum cast |
| `BOOLEAN` | `TINYINT(1)` |
| `gen_random_uuid()` default | Model `booted()` → `Str::uuid()` |

**Recommendation:** নতুন schema-তে auto-increment `BIGINT` PK ব্যবহার করব (faster indexes, smaller size); বিদ্যমান UUID FK গুলো migration script দিয়ে remap হবে।

---

## 🔐 RLS → Laravel Middleware Mapping

| Supabase RLS Pattern | Laravel Equivalent |
|---|---|
| `auth.uid() = user_id` | `Model::where('user_id', $request->user()->id)` + Policy |
| `has_role(auth.uid(), 'admin')` | `CheckPermission:admin` middleware |
| Public read (`TO anon`) | Route without `auth:sanctum` |
| Reseller scoping | `BranchScope` global scope on Eloquent models |
| Service-role bypass | Laravel internal (no equivalent needed; controllers control writes) |

Policies files: `app/Policies/{Model}Policy.php` — one per table with meaningful ownership.

---

## 📦 Module Grouping (ধাপ ৪-এর জন্য priority proposal)

আমি নিচের ক্রমে migrate করার প্রস্তাব দিচ্ছি — আপনার approval দরকার:

1. **auth** — `profiles`, `user_roles`, register/login/me/logout
2. **billing** — `invoices`, `invoice_items`, `invoice_templates`, `payments`, `payment_transactions`, `payment_gateways`, `coupons`, `currencies`
3. **services** — `service_catalog`, `services`, `service_addons`, `service_events`, `service_package_changes`, `hosting_packages`, `product_addons`
4. **orders** — `customer_orders`, `order_domain_changes`, `domain_pricing`
5. **projects** — `projects`, `project_milestones`, `project_activity_log`
6. **support** — `support_tickets`, `support_messages`, `kb_articles`, `kb_categories`
7. **crm/marketing** — `leads`, `announcements`, `page_contents`, `page_content_versions`
8. **reseller** — `reseller_branding`, `reseller_customers`, `reseller_pricing`, `referral_commissions`
9. **ops/system** — `team_members`, `salary_payments`, `expenses`, `company_settings`, `whm_servers`, `notifications`, `push_subscriptions`, `audit_logs`, `api_keys`, `outbound_webhooks`, `webhook_deliveries`

প্রতি module-এ: migration → model → controller → route → frontend API wrapper — এবং প্রতি ধাপে confirm নেব।

---

## 🌉 Bridge Strategy (Preview ভাঙা রোধ)

- `src/lib/laravel-auth.ts` — token storage (`localStorage`) + `getApiBaseUrl()` reads `import.meta.env.VITE_API_BASE_URL`
- `src/integrations/supabase/laravel-bridge.ts` — wrapper: যদি `VITE_API_BASE_URL` set থাকে, Laravel endpoint hit করবে; না হলে existing `supabase` client-এ pass-through
- বিদ্যমান কোনো `supabase.from(...)` call এখনই delete হবে না — শুধু bridge-এর মাধ্যমে proxy হবে
- Lovable preview-তে `VITE_API_BASE_URL` unset → Supabase চলবে যথারীতি

---

## 📁 Target Repo Structure (কেবল overview)

```text
/ (repo root)
├── src/                       # existing React frontend (untouched initially)
│   ├── lib/laravel-auth.ts    # NEW bridge
│   └── integrations/supabase/laravel-bridge.ts  # NEW
├── backend/                   # NEW Laravel 11
│   ├── app/{Http,Models,Policies,Services,Observers}
│   ├── database/{migrations,seeders}
│   ├── routes/api.php
│   └── config/{sanctum,cors}.php
├── deploy/vps/
│   ├── install.sh             # one-command VPS bootstrap
│   └── update.sh              # git pull + migrate
├── erp-backend/deploy.sh      # build frontend → backend/public
├── .env.production.example
└── SETUP_GUIDE_BN.md          # Bangla setup guide
```

---

## ❓ শুরু করার আগে আপনার উত্তর দরকার

1. **VPS domain** — `syncsolutionbd.com` কি final? subdomain (api., app.) আলাদা লাগবে?
2. **Module priority** — উপরের ৯টি group order কি ঠিক আছে? নাকি অন্যরকম চান?
3. **Data migration** — বর্তমান Supabase-এর live data কি নতুন MySQL-এ export/import করব, নাকি fresh start?
4. **Super Admin credentials** — username/email/password কী set করব seeder-এ?
5. **PK strategy** — auto-increment `BIGINT` (fast, recommended) নাকি UUID `CHAR(36)` (Supabase-এর সাথে ID compatibility)?
6. **Roles** — বর্তমানে `app_role` enum-এ `admin`, `customer`, `moderator` আছে। আরো role (reseller, staff) লাগবে?

---

## 🚦 পরবর্তী ধাপ

আপনার উপরের ৬টি প্রশ্নের উত্তর পাওয়ার পর ধাপ ২ শুরু হবে:
`backend/` skeleton + Sanctum auth (login / me / logout) + প্রথম migration (`profiles`, `user_custom_roles`)।

**এই ধাপে কোনো ফাইল তৈরি বা edit হয়নি।**
