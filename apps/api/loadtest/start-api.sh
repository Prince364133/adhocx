#!/usr/bin/env bash
# Starts the built API against the LOCAL load-test containers only. Runs from an empty folder so
# ConfigModule finds no .env file (its paths are cwd-relative): every setting comes from below.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="${LOADTEST_RUN_DIR:-${TMPDIR:-/tmp}/adhocx-loadtest-run/a/b}"   # far from any project .env
mkdir -p "$RUN_DIR" && cd "$RUN_DIR"
for f in .env ../.env ../../.env .env.local ../../.env.local; do
  [ -f "$f" ] && { echo "refusing: found $f near the run folder"; exit 1; }
done
SECRET="$(cat "$HERE/.secret")"
export NODE_ENV=production
export PORT="${PORT:-7101}"
export DATABASE_URL="postgresql://load:loadpass@localhost:6433/adhocx_load?schema=public&connection_limit=${DB_POOL:-40}&pool_timeout=20"
export REDIS_URL="redis://localhost:6391"
export REDIS_HOST=localhost REDIS_PORT=6391 REDIS_TLS=false
export JWT_ACCESS_SECRET="$SECRET" JWT_REFRESH_SECRET="${SECRET}_refresh_load_only"
export ALLOW_TEST_OTP=true            # straight-line pricing fallback instead of Google Maps
export ROAD_ETA_ENABLED=false         # no Google road matrix
export GOOGLE_MAPS_API_KEY="" GOOGLE_MAPS_BROWSER_API_KEY=""
export MSG91_ENABLED=false MSG91_AUTH_KEY=""
export DIGIO_CLIENT_ID="" DIGIO_CLIENT_SECRET="" DIGIO_WEBHOOK_SECRET=""
export R2_ACCESS_KEY_ID="" R2_SECRET_ACCESS_KEY="" R2_ACCOUNT_ID="" R2_ENDPOINT="" R2_API_TOKEN=""
export FIREBASE_PROJECT_ID="" FIREBASE_CLIENT_EMAIL="" FIREBASE_PRIVATE_KEY="" GOOGLE_APPLICATION_CREDENTIALS=""
export LOG_LEVEL="${LOG_LEVEL:-warn}"
exec node ${NODE_EXTRA:-} "${API_DIST:-$(cd "$HERE/.." && pwd)/dist}/apps/api/src/main.js"
