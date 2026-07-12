#!/usr/bin/env bash
# SyncSolutionBD — pull latest + migrate + rebuild frontend
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/snsbd}"
REPO_BRANCH="${REPO_BRANCH:-main}"

cd "$APP_DIR"
git fetch --all
git reset --hard "origin/$REPO_BRANCH"

# Backend
cd "$APP_DIR/backend"
composer install --no-dev --optimize-autoloader --no-interaction
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan cache:clear

# Frontend
cd "$APP_DIR"
npm ci
npm run build
if [[ -d dist ]]; then
  rm -rf "$APP_DIR/backend/public/assets" 2>/dev/null || true
  cp -r dist/* "$APP_DIR/backend/public/"
elif [[ -d .output/public ]]; then
  cp -r .output/public/* "$APP_DIR/backend/public/"
fi

chown -R www-data:www-data "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache" "$APP_DIR/backend/public"

systemctl reload php8.2-fpm || true
systemctl reload nginx

echo "✅ Update complete."
