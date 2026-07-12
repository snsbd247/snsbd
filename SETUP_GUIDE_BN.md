# SyncSolutionBD — VPS Setup Guide (বাংলা)

এই গাইডটি অনুসরণ করে আপনি একটি ফ্রেশ **Ubuntu 22.04 / 24.04 VPS**-এ SyncSolutionBD-কে চালাতে পারবেন।

---

## ১. যা যা লাগবে

- একটি ফ্রেশ Ubuntu 22.04 বা 24.04 VPS (Root access সহ)
- একটি domain — উদাহরণ: `syncsolutionbd.com` (A record VPS-এর IP-তে point করা)
- আপনার Git repo-এর URL (GitHub / GitLab / Bitbucket)

---

## ২. ইনস্টলেশন (এক কমান্ড)

VPS-এ SSH দিয়ে login করে:

```bash
# 1. root user-এ যান
sudo -i

# 2. install script download করুন (repo থেকে সরাসরি)
wget https://raw.githubusercontent.com/YOUR_ORG/snsbd/main/deploy/vps/install.sh
chmod +x install.sh

# 3. আপনার config দিয়ে চালান
DOMAIN=syncsolutionbd.com \
REPO_URL=https://github.com/YOUR_ORG/snsbd.git \
ADMIN_EMAIL=admin@syncsolutionbd.com \
bash install.sh
```

Script যা যা করবে:

1. Nginx, PHP 8.2-FPM, MySQL 8, Node 20, Composer, Certbot ইনস্টল
2. MySQL database + user তৈরি (random password)
3. Repo clone → `/var/www/snsbd/`
4. Backend: `composer install`, `.env` তৈরি, `key:generate`, `migrate --seed`
5. Frontend: `npm ci && npm run build`, output copy → `backend/public/`
6. Nginx vhost + SSL (Let's Encrypt) সেটাপ
7. সব permission ঠিক করা

শেষ হলে console-এ দেখাবে:

```
✅ Installation complete!
 URL:        https://syncsolutionbd.com
 Admin:      superadmin / Admin@123
 DB pass:    <randomly-generated>
```

---

## ৩. Admin login

- URL: `https://syncsolutionbd.com`
- Username: `superadmin`
- Password: `Admin@123` ← **প্রথম login-এর পর অবশ্যই পরিবর্তন করুন**

---

## ৪. পরবর্তী update (Git থেকে pull)

Code পরিবর্তন করার পর VPS-এ:

```bash
sudo bash /var/www/snsbd/deploy/vps/update.sh
```

এটি করবে: `git pull` → `composer install` → `migrate` → `npm build` → cache clear → nginx reload।

---

## ৫. Directory Structure (VPS-এ)

```
/var/www/snsbd/
├── backend/            ← Laravel API (document root: backend/public)
│   ├── .env            ← MySQL creds, APP_KEY (auto-generated)
│   ├── storage/
│   │   └── app/public/logos/   ← uploaded logo files
│   └── public/
│       ├── index.php   ← Laravel entry
│       ├── index.html  ← React SPA entry (copied from dist/)
│       └── assets/     ← React build output
├── src/                ← React source
├── deploy/vps/         ← এই scripts
└── .env.production     ← VITE_API_BASE_URL
```

---

## ৬. Nginx routing (সংক্ষেপে)

| Path | কোথায় যাবে |
|---|---|
| `/api/*` | Laravel (`backend/public/index.php`) |
| `/storage/*` | Uploaded files (logo, favicon) |
| `/*` (অন্য সব) | React SPA (`index.html`) |

---

## ৭. সাধারণ সমস্যা

**Q: `permission denied` error storage-এ**
```bash
sudo chown -R www-data:www-data /var/www/snsbd/backend/storage
sudo chmod -R 775 /var/www/snsbd/backend/storage
```

**Q: Certbot fail করেছে**
```bash
sudo certbot --nginx -d syncsolutionbd.com -d www.syncsolutionbd.com
```

**Q: API 500 error**
```bash
tail -f /var/www/snsbd/backend/storage/logs/laravel.log
```

**Q: Frontend পুরনো version দেখাচ্ছে**
- Browser cache clear
- অথবা `sudo bash /var/www/snsbd/deploy/vps/update.sh`

**Q: MySQL password ভুলে গেছি**
```bash
grep DB_PASSWORD /var/www/snsbd/backend/.env
```

---

## ৮. Environment variables

**Backend** (`backend/.env`) — install script auto-set করে দেয়:
- `APP_URL`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`
- `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`

**Frontend** (`.env.production`):
- `VITE_API_BASE_URL=https://syncsolutionbd.com/api` ← এটাই Laravel mode enable করে

`VITE_API_BASE_URL` empty রাখলে frontend Supabase-এ fallback করে (Lovable preview এর জন্য)।

---

## ৯. Data migration (Supabase → MySQL)

এই gap-এ Supabase থেকে current data export করে MySQL-এ import করার script আলাদাভাবে দেব (ধাপ ৬-এ)।

---

সমস্যা হলে: `tail -f /var/www/snsbd/backend/storage/logs/laravel.log` এবং `sudo journalctl -u nginx -n 50`।
