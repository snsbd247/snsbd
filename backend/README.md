# SyncSolutionBD Laravel Backend

Laravel 11 + Sanctum + MySQL 8. Serves the React frontend from `public/`.

## Local setup

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Super admin (from seeder):

- username: `superadmin`
- email: `superadmin@syncsolutionbd.com`
- password: `Admin123`

## API (v1)

| Method | Path                   | Auth | Purpose                       |
|--------|------------------------|------|-------------------------------|
| POST   | `/api/v1/auth/register`| —    | Create user + profile + role  |
| POST   | `/api/v1/auth/login`   | —    | `{ identifier, password }`    |
| GET    | `/api/v1/auth/me`      | Bearer | Current user + profile + roles |
| POST   | `/api/v1/auth/logout`  | Bearer | Revoke current token          |

`identifier` accepts email OR username.

## Middleware

- `permission:admin` — requires the named role(s)
- `branch`           — reseller scope placeholder

## Roles

Enum: `admin`, `customer`, `moderator`, `reseller`, `staff`. Stored in
`user_custom_roles` (never on `profiles`/`users`).
