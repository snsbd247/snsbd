# SyncSolutionBD Backend (Laravel 11)

## Local install

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
# Configure MySQL creds in .env
php artisan migrate --seed
php artisan serve
```

Super Admin (created by seeder):
- Username: `superadmin`
- Password: `Admin@123`
- Email: `superadmin@syncsolutionbd.com`

## API auth

- `POST /api/auth/register` — first user auto-becomes admin
- `POST /api/auth/login` — body: `{ login, password }` (login = email OR username)
- `GET  /api/auth/me` — Bearer token
- `POST /api/auth/logout`

Token is returned in the login/register response as `token`; frontend sends it as `Authorization: Bearer <token>`.

## Next modules (in migration order)

1. Auth ✅ (this step)
2. Company Settings
3. Hosting Packages + Domain Pricing
4. Customer Orders + Payments
5. Services + WHM
6. Invoices
7. Projects + Milestones
8. Leads
9. Team + Salary
10. Expenses
