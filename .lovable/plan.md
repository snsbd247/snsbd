# ধাপ ১ — Migration Plan (শুধু পরিকল্পনা, কোনো কোড নয়)

## বর্তমান Backend Inventory (Supabase)

### Tables (22টি — সব `public` schema-এ)

| # | Supabase Table | ভূমিকা | MySQL Target Table |
|---|---|---|---|
| 1 | `profiles` | user profile (auth.users এর সাথে 1:1) | `users` (Laravel default) + extra columns |
| 2 | `user_roles` | role assignment (admin/customer) | `user_custom_roles` |
| 3 | `company_settings` | logo, brand, bKash number, address | `company_settings` |
| 4 | `team_members` | staff list | `team_members` |
| 5 | `leads` | CRM leads | `leads` |
| 6 | `projects` | client projects | `projects` |
| 7 | `project_milestones` | milestones | `project_milestones` |
| 8 | `project_activity_log` | audit log (auto by trigger) | `project_activity_logs` (Laravel Observer) |
| 9 | `services` | active hosting/domain services | `services` |
| 10 | `service_catalog` | service definitions | `service_catalog` |
| 11 | `service_package_changes` | upgrade/downgrade log | `service_package_changes` (Observer) |
| 12 | `hosting_packages` | plan list (price, limits) | `hosting_packages` |
| 13 | `domain_pricing` | TLD-wise price | `domain_pricing` |
| 14 | `whm_servers` | WHM/cPanel server list | `whm_servers` |
| 15 | `customer_orders` | order intake | `customer_orders` |
| 16 | `invoices` | invoice header | `invoices` |
| 17 | `invoice_items` | invoice lines | `invoice_items` |
| 18 | `payments` | payment record | `payments` |
| 19 | `payment_gateways` | gateway config | `payment_gateways` |
| 20 | `payment_transactions` | transaction log | `payment_transactions` |
| 21 | `expenses` | expense tracking | `expenses` |
| 22 | `salary_payments` | staff salary | `salary_payments` |

### Database Functions (7টি) — MySQL-এ কীভাবে map হবে

| Supabase Function | ভূমিকা | Laravel Replacement |
|---|---|---|
| `has_role(uuid, app_role)` | role check | `User::hasRole()` (Gate/Policy) |
| `is_admin(uuid)` | admin check | `User::isAdmin()` helper + middleware |
| `email_for_username(text)` | username → email lookup | `AuthController::login()` এ query |
| `handle_new_user()` | signup এ profile+role auto-create | `RegisterController` + first-user-admin logic |
| `set_updated_at()` | updated_at trigger | Eloquent auto (`$timestamps=true`) |
| `log_milestone_activity()` | milestone log trigger | `MilestoneObserver` |
| `log_service_package_change()` | package change log trigger | `ServiceObserver` |

### RLS Policies → Laravel Middleware Mapping

Supabase RLS-এর সব policy Laravel-এ দুটো middleware দিয়ে handle হবে:
- `auth:sanctum` — token verification
- `CheckPermission` — role-based (admin/customer/staff) route guard
- `BranchScope` (যদি multi-branch থাকে) — data isolation
- Controller-এ `Gate::authorize()` — row-level (own data only)

### Data Type Mapping (PostgreSQL → MySQL 8)

| Postgres | MySQL |
|---|---|
| `uuid` (PK) | `CHAR(36)` + Laravel `HasUuids` trait, অথবা `BIGINT AUTO_INCREMENT` (recommended for FK performance) |
| `text` | `TEXT` / `VARCHAR(255)` |
| `jsonb` | `JSON` |
| `timestamp with time zone` | `TIMESTAMP` |
| `numeric` | `DECIMAL(12,2)` |
| `boolean` | `TINYINT(1)` |
| `app_role` (enum) | `ENUM('admin','customer','staff')` |
| Array types | `JSON` |
| `gen_random_uuid()` | `(UUID())` default অথবা Laravel trait |

**Recommendation:** নতুন MySQL schema-এ `BIGINT AUTO_INCREMENT` PK ব্যবহার করব (আপনার rule #3 অনুযায়ী), UUID শুধু public-facing identifier যেখানে দরকার সেখানে extra column হিসেবে।

### Storage / Files
- Supabase Storage bucket: **নেই** (project-এ কোনো bucket configured নেই)
- Logo upload: বর্তমানে `company_settings.logo_url` কলামে URL — Laravel-এ `storage/app/public/logos/` + `php artisan storage:link`

### Edge Functions / Server Functions
- বর্তমানে TanStack `createServerFn` ব্যবহৃত হচ্ছে (WHM account create, order activate, ইত্যাদি)
- Laravel-এ এগুলো Controller action হবে (`ActivateOrderController@activate`, `WhmController@createAccount`)

### Auth Flow পরিবর্তন
- **এখন:** Supabase Auth (email/password + Google OAuth broker) + session-based
- **নতুন:** Laravel Sanctum token — `POST /api/auth/login` → token → `Authorization: Bearer <token>` header
- Google OAuth: Laravel Socialite package (`laravel/socialite`) দিয়ে re-implement

## Frontend Bridge Strategy (Rule #2)

```
VITE_API_BASE_URL সেট আছে?
   ├── হ্যাঁ → laravel-bridge.ts → fetch(`${BASE}/api/...`)
   └── না  → বর্তমান supabase client (Lovable preview ভাঙবে না)
```

সব `supabase.from('table').select()` call কে `dataClient.table('table').select()` abstraction দিয়ে replace করা হবে ধীরে ধীরে, module by module।

## Module Migration Priority (Suggestion)

ছোট থেকে বড়, dependency অনুযায়ী:

1. **Auth** (users, user_custom_roles) — সব কিছুর ভিত্তি
2. **Company Settings** (logo, brand)
3. **Hosting Packages + Domain Pricing** (marketing site দেখাবে)
4. **Customer Orders + Payments** (order flow)
5. **Services + WHM integration** (activation)
6. **Invoices + Invoice Items**
7. **Projects + Milestones + Activity Log**
8. **Leads / CRM**
9. **Team Members + Salary**
10. **Expenses**

## Deploy Target Stack (Rule confirmation)

- Ubuntu 22.04/24.04, Nginx, PHP 8.2-FPM, MySQL 8, Node 20, Certbot
- Frontend build (`npm run build`) → `backend/public/` (Laravel document root)
- Domain: **syncsolutionbd.com** (আপনার confirm লাগবে)

---

## ⚠️ শুরু করার আগে আমার প্রশ্ন

1. **VPS domain:** `syncsolutionbd.com` কি চূড়ান্ত? নাকি অন্য কিছু?
2. **Module priority:** উপরের ক্রম ঠিক আছে, নাকি আপনি অন্য order চান?
3. **Data migration:** বর্তমান Supabase data (orders, invoices, users, ইত্যাদি) নতুন MySQL-এ export/import করতে হবে, নাকি fresh start?
4. **Super Admin:** username + email কী দেব seed-এ?
5. **PK type:** `BIGINT AUTO_INCREMENT` (fast, recommended) নাকি `CHAR(36) UUID` (Supabase compatible)?

---

## ⚠️ Important Warning

এই কাজটি **এই বর্তমান Lovable project-এ করা যাবে না** নিরাপদভাবে — কারণ:

- Lovable Cloud + TanStack Start template Supabase-এর সাথে গভীরভাবে integrated
- `backend/` folder + PHP files এই sandbox-এ run হবে না (Node/Vite only)
- `install.sh`, VPS deploy scripts — এগুলো আপনার VPS-এ run হবে, Lovable-এ না

**সুরক্ষিত পথ:** আপনার prompt-এই লেখা আছে "নতুন প্রজেক্টে পেস্ট করুন" — অর্থাৎ এটা নতুন Lovable project-এ শুরু করা উচিত, অথবা সরাসরি লোকাল machine/VPS-এ। এই SNSBD project-এ যদি Laravel skeleton generate করি তাহলে বর্তমান working app ভেঙে যেতে পারে।

**আপনার সিদ্ধান্ত দরকার:**
- (a) এই বর্তমান project-এ backend/ folder generate করব (frontend অক্ষত থাকবে, শুধু নতুন folder যোগ হবে) — কিন্তু Lovable-এ Laravel চালানো/test করা যাবে না, শুধু code তৈরি হবে VPS-এ deploy-এর জন্য
- (b) আপনি নতুন Lovable project খুলে এই prompt পেস্ট করবেন
- (c) আমি শুধু full plan + file list দিয়ে দেব, আপনি local editor-এ কাজ করবেন

উপরের প্রশ্নগুলোর উত্তর দিন, তারপর ধাপ ২ (backend skeleton) শুরু করব।
