# SyncSolutionBD — cPanel Setup Guide (বাংলা)

এই গাইড দেখাবে কিভাবে **cPanel shared hosting** এ SyncSolutionBD সেটাপ করবেন (Laravel API + React SPA + MySQL)।

---

## ✅ পূর্বশর্ত (cPanel এ যা থাকতে হবে)

আপনার cPanel hosting-এ এইগুলা থাকা লাগবে:

- **PHP 8.2+** (cPanel → *MultiPHP Manager* থেকে select করুন)
- **MySQL 5.7+ / 8.0**
- **Composer** support (বেশিরভাগ cPanel-এ থাকে; না থাকলে *Terminal* বা host support-কে বলুন)
- **SSH / Terminal access** (Recommended — না থাকলে File Manager দিয়েও হবে, শুধু বেশি সময় লাগবে)
- এই PHP extension গুলা enable থাকতে হবে: `mbstring`, `xml`, `curl`, `zip`, `bcmath`, `gd`, `intl`, `pdo_mysql`, `tokenizer`, `fileinfo`

Hosting company কে বলবেন: *"PHP 8.2 with above extensions, Composer, and SSH access enable করে দিন।"*

---

## 📦 ধাপ ১: Local machine এ deployment package তৈরি

আপনার laptop/PC-তে (project folder-এ):

```bash
DOMAIN=syncsolutionbd.com bash deploy/cpanel/build-package.sh
```

এটা তৈরি করবে:

```
dist/cpanel/
├── snsbd-app.zip      ← Laravel backend (public_html এর বাইরে যাবে)
└── snsbd-public.zip   ← React build + Laravel front controller (public_html এ যাবে)
```

> **Note:** আপনার machine-এ `node`, `npm`, `composer`, `zip` install থাকতে হবে।

---

## 📁 ধাপ ২: cPanel-এ folder structure

Login করে *File Manager* খুলুন। আপনার home directory (`/home/USERNAME/`) এ এইভাবে সাজাবেন:

```
/home/USERNAME/
├── snsbd_app/            ← Laravel এর সব কিছু (public/ ছাড়া)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── routes/
│   ├── storage/
│   ├── vendor/
│   ├── artisan
│   └── .env              ← এখানে config
│
└── public_html/          ← ব্রাউজার এই folder দেখে
    ├── index.php         ← Laravel front controller (path fixed)
    ├── .htaccess         ← API + SPA routing
    ├── index.html        ← React app
    ├── assets/           ← React build assets
    └── favicon.ico
```

---

## 📤 ধাপ ৩: Upload

### ৩.১ Backend (snsbd_app)
1. cPanel → **File Manager** → home directory (`/home/USERNAME/`)
2. **Upload** → `dist/cpanel/snsbd-app.zip`
3. Upload শেষে zip-এর উপর right-click → **Extract**
4. একটা folder তৈরি হবে; rename করে `snsbd_app` করুন (যদি আগে থেকে না থাকে)

### ৩.২ Frontend + Laravel entry (public_html)
1. `public_html/` folder-এ থাকা সব file **Delete** করুন (নতুন install হলে default `cgi-bin`, `.well-known` রেখে দিন)
2. **Upload** → `dist/cpanel/snsbd-public.zip` **public_html এর ভিতরে**
3. Extract করুন

---

## 🗄️ ধাপ ৪: MySQL database তৈরি

cPanel → **MySQL Databases**:

1. **Create New Database**: `USERNAME_snsbd`
2. **Create User**: `USERNAME_snsbd` + একটা strong password (**লিখে রাখুন**)
3. **Add User to Database** → *ALL PRIVILEGES* দিন

Final naming হবে যেমন: `myacc_snsbd` / `myacc_snsbd` / password

---

## ⚙️ ধাপ ৫: `.env` file তৈরি

File Manager → `/home/USERNAME/snsbd_app/` এ যান:

1. `.env.example` → copy → rename `.env`
2. Right-click → **Edit** — এই values বসান:

```env
APP_NAME="SyncSolutionBD"
APP_ENV=production
APP_KEY=                                          # পরের ধাপে generate
APP_DEBUG=false
APP_URL=https://syncsolutionbd.com
APP_TIMEZONE=Asia/Dhaka

LOG_CHANNEL=stack
LOG_LEVEL=warning

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=USERNAME_snsbd
DB_USERNAME=USERNAME_snsbd
DB_PASSWORD=আপনার_password

FILESYSTEM_DISK=public
SESSION_DRIVER=file
CACHE_DRIVER=file
QUEUE_CONNECTION=database

SANCTUM_STATEFUL_DOMAINS=syncsolutionbd.com,www.syncsolutionbd.com
SESSION_DOMAIN=.syncsolutionbd.com
CORS_ALLOWED_ORIGINS=https://syncsolutionbd.com,https://www.syncsolutionbd.com
```

Save করুন।

---

## 🔧 ধাপ ৬: Terminal commands (SSH)

cPanel → **Terminal** খুলুন (অথবা SSH দিয়ে connect করুন), এবং run করুন:

```bash
cd ~/snsbd_app

# ১. Composer dependencies যদি upload-এ না থাকে
# (build-package.sh vendor সহ দেয়, তাই সাধারণত এটা skip করা যায়)
# composer install --no-dev --optimize-autoloader

# ২. App key generate
php artisan key:generate --force

# ৩. Database migrate + seed (admin user তৈরি হবে)
php artisan migrate --force --seed

# ৪. Storage symlink (public disk → uploaded logo/favicon serve করার জন্য)
# cPanel-এ symlink কাজ না করলে manually তৈরি করুন:
ln -s ~/snsbd_app/storage/app/public ~/public_html/storage

# ৫. Cache
php artisan config:cache
php artisan route:cache

# ৬. Permissions
chmod -R 775 storage bootstrap/cache
```

> **SSH না থাকলে:** cPanel → *PHP Selector* / *Setup PHP App* এ artisan command run করার option থাকে। অথবা hosting support-কে বলুন: *"Please run `php artisan migrate --force --seed` in ~/snsbd_app"*।

---

## 🌐 ধাপ ৭: Domain point + SSL

1. cPanel → **Domains** → confirm করুন `syncsolutionbd.com` document root = `public_html`
2. cPanel → **SSL/TLS Status** → *Run AutoSSL* (Let's Encrypt free SSL)
3. **Force HTTPS** enable করুন (cPanel → *Domains* → toggle)

---

## ✅ ধাপ ৮: Verify

Browser এ open করুন:

- `https://syncsolutionbd.com` → React homepage দেখাবে
- `https://syncsolutionbd.com/api/hosting-packages` → JSON response দেখাবে
- `https://syncsolutionbd.com/auth` → login page

**Default admin login:**
- Username: `superadmin`
- Password: `Admin@123`

> ⚠️ প্রথম login-এর পর অবশ্যই password পরিবর্তন করুন (Profile page)।

---

## 🔄 পরবর্তী update deploy করতে

Local machine এ code change করার পর:

```bash
DOMAIN=syncsolutionbd.com bash deploy/cpanel/build-package.sh
```

তারপর cPanel-এ:
- **snsbd-public.zip** upload → `public_html/` extract (overwrite)
- Code change যদি backend-এ থাকে: **snsbd-app.zip** ও extract করুন `~/snsbd_app/` এ
- Terminal-এ:
  ```bash
  cd ~/snsbd_app
  php artisan migrate --force
  php artisan config:cache
  php artisan route:cache
  ```

---

## 🐛 Troubleshooting

**"500 Server Error"** — `~/snsbd_app/storage/logs/laravel.log` দেখুন। সাধারণত:
- `.env` missing → step 5 দেখুন
- `APP_KEY` empty → `php artisan key:generate --force`
- Permission → `chmod -R 775 storage bootstrap/cache`

**"Class not found"** — vendor upload হয়নি। Terminal-এ:
```bash
cd ~/snsbd_app && composer install --no-dev --optimize-autoloader
```

**API 404** — `public_html/.htaccess` upload হয়নি। Zip re-extract করুন (hidden files show করুন)।

**Logo/favicon upload হয় কিন্তু দেখায় না** — storage symlink নেই:
```bash
ln -s ~/snsbd_app/storage/app/public ~/public_html/storage
```

**React SPA route refresh এ 404** — `.htaccess` missing। Step 3.2 আবার করুন।

**cPanel-এ SSH নাই** — hosting support কে বলুন enable করে দিতে, অথবা:
- Composer commands: cPanel → *Softaculous* বা *Terminal* খুঁজুন
- Artisan commands: `public_html/` এ একটা temporary PHP file বানিয়ে `\Artisan::call('migrate', ['--force'=>true]);` চালিয়ে delete করুন (secure না, তাই SSH-ই ভালো)

---

## 📋 Checklist

- [ ] PHP 8.2 selected in MultiPHP Manager
- [ ] MySQL DB + user created + privileges granted
- [ ] `snsbd_app` uploaded to `~/` (public_html এর বাইরে)
- [ ] `public_html/` contents replaced with `snsbd-public.zip`
- [ ] `.env` তৈরি + DB creds বসানো
- [ ] `php artisan key:generate` চালানো
- [ ] `php artisan migrate --seed` চালানো
- [ ] `storage` symlink তৈরি
- [ ] SSL install + Force HTTPS
- [ ] `https://domain/api/hosting-packages` JSON return করছে
- [ ] Admin login (`superadmin` / `Admin@123`) কাজ করছে
- [ ] Admin password change করা হয়েছে

---

সমস্যা হলে log: `~/snsbd_app/storage/logs/laravel.log`
