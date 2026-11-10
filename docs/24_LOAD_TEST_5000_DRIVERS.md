# 24 — Load Test: 5,000 Drivers + Hundreds of Concurrent Bookings

**Date:** 2026-11-10 · **Tool:** k6 v2.3.0 · **Target:** production build of `apps/api` (`NODE_ENV=production`) against **local throwaway** PostGIS 16 + Redis 7 containers. No production database or third-party API was touched: the API ran from an isolated folder with no `.env`, Google Maps / MSG91 / Digio / Firebase / R2 disabled.

Scripts (reproducible): `seed.js` (5,000 verified/available drivers in a 25 km radius around Connaught Place + 300 verified vendors, JWTs), `k6-fleet.js`, `monitor.js`, `profile.js` (CPU profile over the inspector), `gc-heap.js` (forced-GC retained heap). They live in the session scratchpad; copy them to `apps/api/loadtest/` to keep them.

---

## 1. Load model

5,000 driver apps generate a request **rate**, not 5,000 browsers. The test replays it with k6 arrival-rate executors (a few hundred VUs):

| Scenario | Real behaviour reproduced | Rate at 100 % |
|---|---|---|
| `driver_heartbeat` | `POST /drivers/location` every 30 s per driver | 167 req/s |
| `driver_poll` | app refresh every 6 s: `GET /offers` + `GET /trips`; a driver who sees an offer accepts it 70 % of the time | 833 it/s = 1,667 req/s |
| `booking_burst` | 300 vendors book at the same moment | 300 bookings in ~10 s |
| `booking_sustained` | steady demand | 5 bookings/s for 4 min |

Total target ≈ **1,830 req/s**. 91 % of it is the 6-second poll.

## 2. Issues found and fixed

| # | Finding | Evidence | Fix |
|---|---|---|---|
| P1 | **New `GoogleMapsService` per `GET /offers`.** `OffersModule` did not import `LocationsModule`, so `OffersService` built `new GoogleMapsService()` per request; every instance has empty caches, so with a key **each poll re-ran paid Google Routes calls** for every visible offer | 17,758 "GOOGLE_MAPS_API_KEY is not set" constructor warnings in ~3 min | `OffersModule` imports `LocationsModule` (shared, cached singleton); `GoogleMapsService.sharedInstance()` for non-DI paths; key warning logged once |
| P2 | **Debug/verbose logging hard-coded on in production** (`main.ts`); `LOG_LEVEL` ignored | stdout writes were the top CPU item (`writeUtf8String`/`writev`/`consoleCall` ≈ 2.7 s of a 20 s profile) | `LOG_LEVEL` honoured; production default `log`; per-search spatial logs demoted to `debug` |
| P3 | **JWT verify built a key from the secret on every request**, via an exception (`createPublicKey` throws for HMAC, then `createSecretKey`) | `createPublicKey` ≈ 0.6 s / 20 s profile | Cached `KeyObject` per secret in `JwtAuthGuard` |
| P4 | **`trips` had no index on `driver_id`**: every driver poll scanned the whole table → latency grows with trip history | 359,354 seq scans / **63.9 M rows** read in one 7-min run | `@@index([driverId, status])` |
| P5 | `offers` had no index for "my live offers" | 11,624 seq scans | `@@index([driverId, status, expiresAt])` |
| P6 | Dispatch DB fallback loaded **every** available driver into Node | 29.8 M driver rows read | Lat/lng bounding box in the query + `drivers_dispatch_fallback_idx` |
| P7 | `vehicles.driver_id` unindexed (Postgres does not index FKs); dispatch loads candidates' vehicles | 1,313 full scans | `@@index([driverId])` |
| P8 | **Keep-alive race**: Node's 5 s default closes sockets a load balancer (ALB idle 60 s) reuses → sporadic resets/502s | "connection forcibly closed" under load | `keepAliveTimeout` 65 s (`HTTP_KEEP_ALIVE_TIMEOUT_MS`), `headersTimeout` above it |
| L1–L4 | **Unbounded in-process caches** (only cleaned when the same key is read again): Maps route/ETA/verified-route caches, geocoding cache, Redis fallback store (all keys during a Redis outage), corporate OTP failures | static audit; retained heap +14 MB per load cycle before the fix | `setBounded` (size cap, oldest evicted) everywhere; Redis fallback also sweeps expired keys every 1,000 writes |
| L5 | Payments housekeeping `setInterval` never unref'd | static audit | `.unref()` |

Migration: `apps/api/prisma/migrations/20261110120000_hot_path_indexes` (`CREATE INDEX IF NOT EXISTS`). **On a large production `trips` table run these first by hand with `CREATE INDEX CONCURRENTLY`** to avoid locking writes; the migration then no-ops.

## 3. Results

### Same load (25 %, ≈ 220 req/s), one API process, before vs after P1–P3

| Metric | Before | After |
|---|---|---|
| API main thread busy | 95.8 % | 80.5 % |
| Driver poll p95 | 549 ms | **36.5 ms** |
| Heartbeat p95 | 489 ms | **46 ms** |
| Booking p95 | 5.9 s | **2.5 s** |
| Dropped iterations | 84 | **0** |
| Errors | 0 % | 0.004 % (2 keep-alive resets → P8) |

### Full load (100 % ≈ 1,830 req/s target)

| Run | Throughput | Poll p95 | Booking p95 | p99 (all) | Failed |
|---|---|---|---|---|---|
| 1 process, before P4–P7 | 577 req/s | 2.94 s | 21.9 s | 7.72 s | 0.07 % |
| 1 process, after P4–P7 | **764 req/s** (+32 %) | 1.39 s | 9.9 s | 2.06 s | 0.04 % |
| 3 processes | 670–775 req/s | 1.47–1.8 s | 15–18 s | 2.5–3.2 s | 0.02–0.06 % |

**The 3-process run is capped by this laptop, not by the API.** The whole host was at 93 % CPU: each API process uses ≈ 1.8 cores (Prisma's query engine runs native threads in-process), k6 ≈ 0.75 core, plus Postgres in the Docker VM. Database time for the whole run was only ≈ 200 s over 6 min (pg_stat_statements); no query was the bottleneck.

### Correctness under concurrency (3 instances racing)

0 drivers with > 1 active trip · 0 requirements with more trips / accepted offers than quantity · 0 `assigned_quantity > quantity` (621 trips, 1,801 bookings).

### Memory / leaks

| Measurement (forced GC) | Value |
|---|---|
| Before fixes: retained heap growth per full cycle | +14.4 MB (53.1 → 67.5 MB) |
| After fixes: retained heap growth per full cycle | +4.0 MB (51.9 → 55.9 MB) |
| 13.5-min soak, 348,698 requests (§4) | **+0 MB** (56.8 → 56.4 MB idle) |

RSS rises to a plateau (≈ 500–600 MB at full load) and stays there: V8 keeps the high-water heap reserved; it is not a leak by itself.

## 4. Soak test (leak check)

One instance, 40 % load (≈ 730 req/s, its capacity on this host), 13.5 minutes, 348,698 requests, 0.01 % failed. Retained heap after a forced full GC:

| t | 0 | 3 min | 6 min | 9 min | 12 min | idle +30 s |
|---|---|---|---|---|---|---|
| heap (MB) | 56.8 | 71.4 | 75.5 | 74.4 | 69.7 | **56.4** |

It plateaus under load (in-flight working set + bounded caches filling), does not climb, and returns to the starting value at idle. **No leak.** RSS stayed flat at ≈ 590 MB; Redis key count slowly *declined* (TTLs working); Postgres connections stayed at the pool size (41).

Soak latency (poll p95 2.7 s, booking p95 12.6 s) reflects one instance running at its ceiling on a shared, saturated laptop; see §5 for sizing.

## 5. Capacity planning (production)

* **One API instance ≈ 700–760 req/s at ≈ 2 vCPU.** 5,000 drivers at the current 6 s poll ≈ 1,830 req/s ⇒ **≥ 3 instances, run 4–6** for headroom and rolling deploys (2 vCPU / 1 GB each), behind the load balancer. Multi-instance correctness was verified above.
* Postgres: pool 40 per instance; keep `max_connections` ≥ instances × 40 + 20, or put PgBouncer in front.
* **Biggest remaining lever: the 6-second poll is 91 % of all traffic.** The app already receives offers over the realtime socket. Polling every 30 s while the socket is connected (6 s only when it is down) cuts total load ≈ 4×: 5,000 drivers ≈ 500 req/s, within one instance. Recommended as the next mobile change.
* Not covered here: 5,000 simultaneous WebSocket connections (Socket.IO) — run as a separate test with Artillery or xk6-websockets.

## 6. Not production findings (test-setup artefacts, documented so nobody chases them)

* **Migrations cannot build a database from scratch** (an early migration references `users` before any migration creates it). The test used `prisma db push`. This *is* a real DR risk: add a baseline migration.
* On this Windows checkout the API must be started from the `Desktop` (capital D) path: the pnpm symlink for `@adhocx/contracts` uses that casing, and Node's case-sensitive module cache otherwise loads `class-transformer` twice, which breaks every nested DTO (bookings, trip start, trip pings) with "property … should not exist". Linux/production is unaffected; local dev from a lowercase path is not.
* "`corporate_vehicle_positions` is not partitioned" — `db push` does not create partitions.
