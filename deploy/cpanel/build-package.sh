#!/usr/bin/env bash
# =============================================================================
# SyncSolutionBD — cPanel Deployment Package Builder
# Local machine এ run করলে দুইটা zip তৈরি হবে:
#   dist/cpanel/snsbd-app.zip      → /home/USER/snsbd_app/ এ upload হবে
#   dist/cpanel/snsbd-public.zip   → public_html/ এ upload হবে
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/dist/cpanel"
BACKEND="$ROOT/backend"

# ---- 0. Config (edit or override via env) ----
DOMAIN="${DOMAIN:-syncsolutionbd.com}"
CPANEL_USER="${CPANEL_USER:-cpaneluser}"   # আপনার cPanel username

echo "==> Cleaning old build"
rm -rf "$OUT"
mkdir -p "$OUT/app" "$OUT/public"

# ---- 1. Frontend build ----
echo "==> Building frontend (VITE_API_BASE_URL=https://$DOMAIN/api)"
cd "$ROOT"
cat > .env.production <<EOF
VITE_API_BASE_URL=https://$DOMAIN/api
EOF
npm ci
npm run build

FRONT_DIR=""
[[ -d "$ROOT/dist" ]] && FRONT_DIR="$ROOT/dist"
[[ -d "$ROOT/.output/public" ]] && FRONT_DIR="$ROOT/.output/public"
if [[ -z "$FRONT_DIR" ]]; then
  echo "ERROR: frontend build output not found"; exit 1
fi

# ---- 2. Backend prep ----
echo "==> Installing backend composer deps (production)"
cd "$BACKEND"
composer install --no-dev --optimize-autoloader --no-interaction

# ---- 3. Split into app/ + public/ (cPanel-friendly layout) ----
echo "==> Assembling cPanel package"

# App = everything except public/
rsync -a --delete \
  --exclude 'public' \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude 'storage/logs/*' \
  --exclude 'storage/framework/cache/*' \
  --exclude 'storage/framework/sessions/*' \
  --exclude 'storage/framework/views/*' \
  "$BACKEND/" "$OUT/app/"

# .env.example → users fill in on server
cp "$BACKEND/.env.example" "$OUT/app/.env.example"

# Public = React build + Laravel public files + cPanel-adjusted index.php
rsync -a "$FRONT_DIR/" "$OUT/public/"
cp "$BACKEND/public/.htaccess" "$OUT/public/.htaccess"
cp "$BACKEND/public/favicon.ico" "$OUT/public/favicon.ico" 2>/dev/null || true

# cPanel-adjusted index.php — assumes app lives at ~/snsbd_app
cat > "$OUT/public/index.php" <<'PHP'
<?php
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// cPanel layout: Laravel app lives OUTSIDE public_html
// Adjust this path if you placed the app folder elsewhere
$appRoot = dirname(__DIR__) . '/snsbd_app';

if (file_exists($appRoot . '/storage/framework/maintenance.php')) {
    require $appRoot . '/storage/framework/maintenance.php';
}

require $appRoot . '/vendor/autoload.php';

$app = require_once $appRoot . '/bootstrap/app.php';

$kernel = $app->make(Kernel::class);
$response = $kernel->handle($request = Request::capture())->send();
$kernel->terminate($request, $response);
PHP

# ---- 4. Zip ----
echo "==> Creating zip files"
cd "$OUT/app" && zip -qr "$OUT/snsbd-app.zip" . && cd - >/dev/null
cd "$OUT/public" && zip -qr "$OUT/snsbd-public.zip" . && cd - >/dev/null

echo ""
echo "=============================================="
echo " ✅ cPanel package ready"
echo "=============================================="
echo " App zip:    $OUT/snsbd-app.zip     → ~/snsbd_app/"
echo " Public zip: $OUT/snsbd-public.zip  → ~/public_html/"
echo ""
echo " পরের ধাপ: deploy/cpanel/README_BN.md পড়ুন"
echo "=============================================="
