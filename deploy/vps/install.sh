#!/usr/bin/env bash
# =============================================================================
# SyncSolutionBD — VPS One-Command Installer
# Ubuntu 22.04 / 24.04
# Installs: Nginx + PHP 8.2-FPM + MySQL 8 + Node 20 + Certbot
# Deploys:  Laravel backend + React frontend to /var/www/snsbd
# =============================================================================
set -euo pipefail

# ---- Config (edit before running, or pass as env vars) ----
DOMAIN="${DOMAIN:-syncsolutionbd.com}"
REPO_URL="${REPO_URL:-https://github.com/YOUR_ORG/snsbd.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
APP_DIR="${APP_DIR:-/var/www/snsbd}"
DB_NAME="${DB_NAME:-snsbd}"
DB_USER="${DB_USER:-snsbd}"
DB_PASS="${DB_PASS:-$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@${DOMAIN}}"

echo "=============================================="
echo " SyncSolutionBD VPS Installer"
echo " Domain:  $DOMAIN"
echo " App dir: $APP_DIR"
echo " DB:      $DB_NAME / $DB_USER"
echo "=============================================="

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo bash install.sh"
  exit 1
fi

# ---- 1. System packages ----
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y software-properties-common curl git unzip ca-certificates lsb-release gnupg

# PHP 8.2 (ppa)
add-apt-repository -y ppa:ondrej/php
apt-get update
apt-get install -y \
  nginx \
  php8.2 php8.2-fpm php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl \
  php8.2-zip php8.2-bcmath php8.2-gd php8.2-intl php8.2-tokenizer \
  mysql-server \
  certbot python3-certbot-nginx

# Composer
if ! command -v composer >/dev/null; then
  curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
fi

# Node 20
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1)" != "v20" ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# ---- 2. MySQL database ----
mysql -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# ---- 3. Clone repo ----
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone -b "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR" && git fetch --all && git reset --hard "origin/$REPO_BRANCH"
fi

# ---- 4. Backend (Laravel) ----
cd "$APP_DIR/backend"
composer install --no-dev --optimize-autoloader --no-interaction

if [[ ! -f .env ]]; then
  cp .env.example .env
  sed -i "s|^APP_URL=.*|APP_URL=https://${DOMAIN}|" .env
  sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_NAME}|" .env
  sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USER}|" .env
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASS}|" .env
  sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${DOMAIN},www.${DOMAIN}|" .env
  sed -i "s|^CORS_ALLOWED_ORIGINS=.*|CORS_ALLOWED_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}|" .env
  php artisan key:generate --force
fi

php artisan storage:link || true
php artisan migrate --force --seed
php artisan config:cache
php artisan route:cache

# ---- 5. Frontend build → backend/public ----
cd "$APP_DIR"
cat > .env.production <<EOF
VITE_API_BASE_URL=https://${DOMAIN}/api
EOF

# Install with npm (bun optional)
npm ci
npm run build

# Copy build artifacts into Laravel public/ (index.html + assets)
if [[ -d dist ]]; then
  cp -r dist/* "$APP_DIR/backend/public/"
elif [[ -d .output/public ]]; then
  cp -r .output/public/* "$APP_DIR/backend/public/"
else
  echo "WARN: frontend build output not found (dist/ or .output/public/)"
fi

# ---- 6. Permissions ----
chown -R www-data:www-data "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache" "$APP_DIR/backend/public"
chmod -R 775 "$APP_DIR/backend/storage" "$APP_DIR/backend/bootstrap/cache"

# ---- 7. Nginx vhost ----
cat > /etc/nginx/sites-available/snsbd <<NGINX
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    root ${APP_DIR}/backend/public;
    index index.php index.html;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    client_max_body_size 32M;

    # API → Laravel front controller
    location /api {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    # Storage (public disk)
    location /storage {
        try_files \$uri =404;
    }

    # SPA fallback: everything else → index.html
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~ \.php\$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
    }

    location ~ /\.(?!well-known).* { deny all; }
}
NGINX

ln -sf /etc/nginx/sites-available/snsbd /etc/nginx/sites-enabled/snsbd
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ---- 8. SSL (Certbot) ----
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" --redirect || \
  echo "WARN: certbot failed — run manually: certbot --nginx -d $DOMAIN -d www.$DOMAIN"

# ---- 9. Summary ----
cat <<EOF

==============================================
 ✅ Installation complete!
==============================================
 URL:        https://${DOMAIN}
 API:        https://${DOMAIN}/api
 Admin:      superadmin / Admin@123
 DB pass:    ${DB_PASS}
 App dir:    ${APP_DIR}

 Update in future:
   bash ${APP_DIR}/deploy/vps/update.sh
==============================================
EOF
