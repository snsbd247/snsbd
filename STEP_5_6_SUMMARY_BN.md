# ধাপ ৫–৬ সংক্ষিপ্ত সারাংশ (Reports + Deploy)

## ধাপ ৫ — Reports API
নতুন যোগ:
- `backend/app/Http/Controllers/ReportsController.php`
  - `GET /api/v1/reports/dashboard` — invoice/revenue/expense/salary/service/CRM কাউন্টার
  - `GET /api/v1/reports/finance?from=&to=` — দৈনিক revenue vs expense ব্রেকডাউন
- `src/lib/reports-api.ts` — `reportsApi.dashboard()` / `reportsApi.finance(from,to)`
- `backend/routes/api.php`-এ রুট রেজিস্টার (permission: admin,staff)

## ধাপ ৬ — Deploy / Setup
আগে থেকেই প্রস্তুত ফাইলগুলো ব্যবহার করুন:
- `deploy/vps/install.sh` — Ubuntu 22/24-এ Nginx + PHP 8.2-FPM + MySQL 8 + Node 20 + Certbot এক-কমান্ড ইনস্টলার
- `deploy/vps/update.sh` — কোড আপডেট + migrate + build
- `deploy/cpanel/build-package.sh` — cPanel ZIP প্যাকেজ
- `SETUP_GUIDE_BN.md`, `LOCAL_TEST_BN.md`, `GO_LIVE_CHECKLIST_BN.md`

### VPS-এ প্রথমবার:
```bash
git clone <repo> /var/www/syncsolutionbd && cd /var/www/syncsolutionbd
sudo bash deploy/vps/install.sh yourdomain.com
```

### আপডেট:
```bash
cd /var/www/syncsolutionbd && sudo bash deploy/vps/update.sh
```

### Frontend env (`.env.production`):
```
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

### Backend `.env` মূল কী:
```
DB_CONNECTION=mysql
DB_DATABASE=syncsolutionbd
SANCTUM_STATEFUL_DOMAINS=yourdomain.com
SESSION_DOMAIN=.yourdomain.com
```

Migration চালান: `php artisan migrate --force`
