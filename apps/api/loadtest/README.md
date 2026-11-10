# Load test: 5,000 drivers + concurrent bookings

See `docs/24_LOAD_TEST_5000_DRIVERS.md` for the model, results and findings.

```bash
# 1. Throwaway Postgres (+pg_stat_statements) and Redis — never point this at a real database
docker run -d --rm --name adhocx-load-pg -e POSTGRES_USER=load -e POSTGRES_PASSWORD=loadpass \
  -e POSTGRES_DB=adhocx_load -p 6433:5432 postgis/postgis:16-3.4-alpine \
  -c max_connections=200 -c shared_preload_libraries=pg_stat_statements
docker run -d --rm --name adhocx-load-redis -p 6391:6379 redis:7.2-alpine

# 2. Schema + seed (seed.js refuses anything but localhost:6433)
export DATABASE_URL="postgresql://load:loadpass@localhost:6433/adhocx_load?schema=public"
(cd .. && npx prisma db push --skip-generate)
node -e "console.log(require('crypto').randomBytes(36).toString('base64url'))" > .secret
JWT_ACCESS_SECRET=$(cat .secret) node seed.js

# 3. API (built: `npx nest build`), isolated from any .env
bash start-api.sh &            # PORT=7102 bash start-api.sh & for more instances

# 4. Load + monitoring
node monitor.js &              # monitor.csv
k6 run -e SCALE=0.25 -e HOLD=1m k6-fleet.js                       # warm-up
k6 run -e SCALE=1 -e HOLD=4m -e BASES=http://localhost:7101/api/v1 k6-fleet.js
node gc-heap.js before && node profile.js 20                      # needs NODE_EXTRA=--inspect=127.0.0.1:9230
```
On Windows start the API from the path casing the pnpm symlinks use (see doc §6).
