# Supabase → MySQL Data Migration (বাংলা)

এই গাইড দেখাবে কিভাবে current Lovable Cloud (Supabase) database থেকে data export করে নতুন MySQL-এ import করবেন।

---

## ধাপ ১: Supabase থেকে CSV export

1. Lovable-এ যান
2. **Cloud → Advanced Settings → Export data** click করুন
3. প্রতিটি table CSV হিসেবে download হবে
4. সব CSV একটা folder-এ রাখুন: `supabase-export/`
   - `profiles.csv`, `user_roles.csv`, `company_settings.csv`, `hosting_packages.csv`, ইত্যাদি

---

## ধাপ ২: VPS-এ upload

```bash
scp -r supabase-export/ root@syncsolutionbd.com:/tmp/snsbd-import/
```

---

## ধাপ ৩: MySQL-এ import

VPS-এ SSH দিয়ে:

```bash
cd /var/www/snsbd/backend
php artisan snsbd:import-supabase /tmp/snsbd-import
```

Command যা করবে:
- Dependency-safe order-এ প্রতিটি CSV read করবে
- UUID PK → BIGINT ID map তৈরি করবে (FK remap-এর জন্য)
- প্রতিটি row transform করে insert করবে
- Transaction — কোনো error হলে full rollback

---

## ⚠️ Important Notes

### Password reset প্রয়োজন
Supabase-এর password hash MySQL-এ কাজ করবে না। Import command সব migrated user-এর password `ChangeMe@123` set করে। প্রথম login-এর পর সবাইকে password reset করতে হবে।

Superadmin আলাদা — seeder থেকে `Admin@123` হিসেবে তৈরি হয়েছে।

### Currently supported tables
এই version-এ transform আছে:
- ✅ `profiles` → `users`
- ✅ `user_roles` → `user_custom_roles`
- ✅ `company_settings`

বাকি table-এর transform module migration-এর সাথে যোগ হবে (ধাপ ৪-এর পরবর্তী iterations)।

### Manual verification
Import-এর পর check করুন:
```bash
mysql -u snsbd -p snsbd -e "SELECT COUNT(*) FROM users;"
mysql -u snsbd -p snsbd -e "SELECT * FROM company_settings;"
```

### Re-import
Second time run করার আগে database drop + migrate:
```bash
php artisan migrate:fresh --seed
php artisan snsbd:import-supabase /tmp/snsbd-import
```

---

## Troubleshooting

**"Duplicate entry for username"** — same username দুইজনের কাছে থাকলে CSV manual edit করে unique করুন।

**"Cannot insert NULL"** — Supabase-এ nullable ছিল কিন্তু MySQL-এ NOT NULL। CSV-তে সেই column-এ default value দিন।

**FK constraint fail** — import order ঠিক আছে কিনা দেখুন (parent আগে, child পরে)।

---

সমস্যা হলে: `tail -f backend/storage/logs/laravel.log` দেখুন।
