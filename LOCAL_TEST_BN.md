# Local Test Guide (বাংলা)

দুইভাবে test করা যাবে — **Lovable preview** (Supabase mode) অথবা **Laravel mode** (local বা VPS-এ)।

---

## Mode A: Lovable Preview (Supabase — কোনো সেটাপ লাগবে না)

আপনি এখনই Lovable-এ preview দেখতে পাচ্ছেন — বিদ্যমান Supabase দিয়ে সব কাজ করছে। কিছু করার দরকার নেই।

Bridge (`src/integrations/supabase/laravel-bridge.ts`) নিজে থেকেই detect করে:
- `VITE_API_BASE_URL` **empty** → Supabase ব্যবহার করে
- `VITE_API_BASE_URL` **set** → Laravel API-তে যায়

---

## Mode B: Local Laravel Test (আপনার laptop-এ)

### ১. Requirements

- PHP 8.2+ (`php -v`)
- Composer (`composer -V`)
- MySQL 8 (local বা Docker)
- Node 20+ (`node -v`)

### ২. Backend চালু করুন

```bash
cd backend
cp .env.example .env

# .env-এ MySQL creds edit করুন:
# DB_DATABASE=snsbd
# DB_USERNAME=root
# DB_PASSWORD=your_local_mysql_password

# MySQL-এ database তৈরি করুন:
mysql -u root -p -e "CREATE DATABASE snsbd CHARACTER SET utf8mb4;"

composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve  # http://127.0.0.1:8000
```

Test করুন:
```bash
# Login test
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"superadmin","password":"Admin@123"}'
```

আশা করা response:
```json
{
  "user": { "id": 1, "username": "superadmin", ... },
  "roles": ["admin"],
  "token": "1|abc123..."
}
```

### ৩. Frontend Laravel mode-এ চালু করুন

Repo root-এ নতুন file:

```bash
# .env.local
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

তারপর:
```bash
npm run dev   # http://localhost:5173
```

এখন frontend Laravel-এ call করবে। Login পেজে `superadmin / Admin@123` দিয়ে test করুন।

### ৪. Debug tips

- Backend log: `tail -f backend/storage/logs/laravel.log`
- 401 error → token localStorage-এ আছে কিনা দেখুন (DevTools → Application → Local Storage → `laravel_auth_token`)
- CORS error → `backend/.env`-এ `CORS_ALLOWED_ORIGINS=http://localhost:5173` আছে কিনা check করুন

### ৫. Bridge বন্ধ করুন (Supabase-এ ফিরতে)

```bash
# .env.local delete করুন বা VITE_API_BASE_URL empty করুন
rm .env.local
npm run dev
```

---

## Mode C: VPS Production Test

`SETUP_GUIDE_BN.md` follow করুন — এক কমান্ডে install script সব সেটাপ করে দেবে।

---

## Endpoint list (এখন পর্যন্ত)

| Method | Path | Auth | কাজ |
|---|---|---|---|
| POST | `/api/auth/register` | ❌ | Signup (প্রথম user admin) |
| POST | `/api/auth/login` | ❌ | Login (email/username + password) |
| GET | `/api/auth/me` | ✅ | Current user + roles |
| POST | `/api/auth/logout` | ✅ | Token invalidate |
| GET | `/api/company-settings` | ❌ | Public read |
| PUT | `/api/company-settings` | admin | Update |
| POST | `/api/company-settings/logo` | admin | File upload |

পরবর্তী module migrate হলে এই list বাড়বে।
