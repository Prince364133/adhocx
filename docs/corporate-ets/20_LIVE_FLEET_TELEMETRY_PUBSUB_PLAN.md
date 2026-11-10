# 20 — Live Fleet Telemetry & Pub/Sub: Review and Implementation Plan

**Status:** Plan of record · **Date:** 2026-11-10 · **Supersedes:** the "IMPLEMENTED & VERIFIED" telemetry spec circulated before this review
**Scope:** `apps/api` (ingest, Redis Pub/Sub, SSE gateway), `apps/ops` (live map), `packages/contracts`
**Related:** `12_REALTIME_GPS_TRACKING_AND_NOTIFICATIONS.md`, `docs/14_REALTIME_AND_NOTIFICATIONS.md`, `docs/19_OBSERVABILITY.md`

---

## 0. TL;DR

The architecture direction is right: stateless ingest, Redis as hot state, Pub/Sub for fan-out, a Redis Stream for durable history, Postgres off the hot path, and a snapshot followed by a stream on the client. The circulated spec still overstated what the code does. A line-by-line review found:

| # | Severity | Finding | Where |
|---|---|---|---|
| 1 | **Critical (security)** | Hard-coded JWT fallback secrets. If the env var is missing in prod, anyone who has read the repo can mint an ADMIN token, including one that reads the whole fleet stream | `config/auth.config.ts`, `auth.guard.ts`, `auth.service.ts` |
| 2 | High (security) | Redis TLS with `rejectUnauthorized: false`, so the server certificate is never verified | `redis.service.ts`, `redis-pubsub.service.ts` |
| 3 | High (security) | The SSE stream authenticates only at connect. Revoked or expired users keep streaming. No per-user stream cap. The access token is placed in the query string, so it is logged by proxies | tracking controller, guard |
| 4 | High (scale) | Each SSE connection parses every message and Nest re-stringifies it. There is no conflation and no backpressure, so a slow browser makes Node buffer without bound | tracking controller |
| 5 | High (scale) | The ops page calls `setState` on every GPS fix, which re-renders the full page per ping | `apps/ops/src/app/map/page.tsx` |
| 6 | High (scale) | On-demand `updateLocation` does 2 Postgres writes per ping (`driver.update` + `tripEvent.create`). This is not "zero DB I/O" | `trips.service.ts` |
| 7 | Medium (correctness) | Ingest makes about 7 serial Redis round trips. The "monotonic latest" check is read-then-write, so two concurrent fixes can race and move the cab backwards | `corporate-gps-ingest.service.ts` |
| 8 | Medium (scale) | The fleet snapshot sends N separate `GET`s (up to 5,000) | `corporate-tracking.service.ts` |
| 9 | Medium (product) | On-demand trips are on the stream but missing from the snapshot. On the map they are labelled `RT-…` and cannot be clicked | API + ops |
| 10 | Low (product) | `mapId` + `styles` together, so dark theme is silently ignored. Stream frames drop `driverName`. The "draw path" effect is dead code. No vehicle list or filters | ops |

Section 5 lists what was fixed in this pass. Sections 6–9 cover the remaining work, in order.

---

## 1. Engineering principles applied

1. **The backend is the source of truth; the stream is a hint.** Every client must be able to rebuild state from a snapshot. Losing a Pub/Sub message costs at most one fix interval.
2. **Hot path does O(1) Redis work and no Postgres I/O.** Durable history goes through the Stream → batch writer.
3. **Conflate, don't queue.** A map needs only the *latest* position per vehicle. Every buffer between ingest and pixels is keyed by vehicle and bounded by fleet size, not by message rate.
4. **Fail closed on security, fail open on telemetry.** Missing secrets stop the boot. A Redis outage degrades the live map (in-process bus, snapshot polling) but never fails driver ingest.
5. **Authorization at subscribe time *and* for the lifetime of the subscription.** Long-lived connections must not outlive the credential that opened them.
6. **Measure before claiming.** Latency and throughput numbers are *targets* until a load test (Phase 3) produces them. The earlier spec's "≤185 ms" and "<18% Redis CPU" were never measured.

---

## 2. Target architecture

```
Driver app ──HTTPS POST /…/location──►  API (L1 ingest, stateless, N replicas)
                                          │  1 RTT: EVALSHA ingest.lua
                                          │    ├─ SET NX  dedupe(route,driver,recordedAt)
                                          │    ├─ monotonic SET latest  (only if newer)
                                          │    ├─ XADD corporate:gps:stream MAXLEN ~ 1e6
                                          │    └─ return accepted|duplicate|out_of_order
                                          │  publishBatched (only if accepted): buffered per
                                          │  channel, ONE PUBLISH of a JSON array per 100 ms:
                                          │    telemetry:ops:fleet
                                          │    telemetry:tenant:{tenantId}:fleet
                                          │    (on-demand: ops:fleet + telemetry:trip:{tripId})
                                          ▼
                                   Redis (L2 hot state, L3 Stream)  ── optional separate
                                                                       REDIS_PUBSUB_URL for fan-out
                                          │
              ┌───────────────────────────┼─────────────────────────────┐
              ▼                           ▼                             ▼
   CorporateTelemetryWriter      SSE gateway (per API pod)        Dispatch geo index
   XREADGROUP → batch 500 →      ONE Redis sub per channel/pod    (GEOADD, every ping)
   createMany → partitioned PG   → refcounted hub → per-conn
                                 conflation map {vehicleId→fix}
                                 → flush every 500 ms as one
                                   `event: fixes` (JSON array)
                                          │
                                          ▼
                                 Ops cockpit (Next.js)
                                 snapshot GET /fleet/live → stream
                                 → refs (no React state per fix)
                                 → rAF interpolation, viewport-culled
                                 → ONE canvas overlay draws every cab
                                 → 1 s UI tick for lists/counters
```

### 2.1 Channel model

| Channel | Publishers | Subscribers | Authorization |
|---|---|---|---|
| `telemetry:ops:fleet` | corporate ingest, on-demand trips | ADMIN / OPS fleet stream | role ∈ {ADMIN, OPS} |
| `telemetry:tenant:{tenantId}:fleet` | corporate ingest | CORPORATE_ADMIN / MANAGER fleet stream | tenant from **token**, never from query |
| *(no per-route channel)* | — | the route stream attaches to its route's **tenant** channel and the hub filters by `routeId` | `CorporateAccessGuard` resource check |
| `telemetry:trip:{tripId}` | on-demand trips | (future) rider / vendor trip stream | trip ownership check (to build) |

Rule: **a subscriber's channel is always derived server-side from its identity.** Clients never pass a channel name or a tenant id.

### 2.2 Wire contract (`packages/contracts/src/dtos/telemetry.dto.ts`)

`LiveVehicleTelemetryPayload` carries `routeId` (route id for corporate, trip id for on-demand), `kind: 'CORPORATE_ROUTE' | 'TRIP'`, `driverId`, optional `driverName` / `vehicleNumber` / `tenantId`, `lat`, `lng`, `speedKph`, `heading`, optional `accuracyM` / `batteryPct`, `recordedAt` (device epoch ms, clamped ≤ server time + 5 s), `receivedAt`, `gpsState`, and `status`.

SSE events:

| Stream | Event | Data |
|---|---|---|
| `/corporate/trips/routes/fleet/live-stream` | `fixes` | JSON **array** of payloads: latest per vehicle in the flush window |
| `/corporate/trips/routes/:id/live-stream` | `message` | single payload (back-compat) |
| both | `heartbeat` | `{}` every 25 s (keeps ALB/nginx idle timers alive) |
| both | `reauth` | `{reason}`: `TOKEN_EXPIRED` / `MAX_LIFETIME` (client reconnects at once) or `REVOKED` (logout or suspension on any pod; client backs off and is sent to login) |

Opening a stream: `POST /corporate/trips/live-stream-tickets` (Bearer) → `{ticket}` (30 s, single use, stored hashed, `GETDEL`), then `GET …/live-stream?ticket=…`. The guard never accepts an access token in a URL.

Clients **must** treat `gpsState` as advisory and re-derive it from `recordedAt` (LIVE ≤ 45 s, STALE ≤ 180 s, else OFFLINE) because frames age on screen.

### 2.3 Redis key model

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `corporate:route:telemetry:{routeId}` | string (JSON) | 900 s | latest corporate fix (snapshot + tracking API) |
| `trip:telemetry:{tripId}` | string (JSON) | 900 s | latest on-demand fix (snapshot) |
| `corporate:gps:seen:{route}:{driver}:{ms}` | string | 600 s | re-upload dedupe |
| `trip:telemetry:persist:{tripId}` | string | 10 s | gate: Postgres write at most every 10 s per trip |
| `sse:ticket:{sha256(ticket)}` | string | 30 s | single-use stream ticket |
| Pub/Sub `auth:revocations` | channel | — | `{userId}` / `{tokenHash}`: closes live streams on every pod |
| `corporate:gps:stream` | stream | MAXLEN ~1e6 | durable history buffer (consumer group `corporate:gps:writers`) |

---

## 3. Capacity model (measured 2026-11-10)

Measured with `apps/api/scripts/telemetry-load.ts`: the real ingest service, Lua script, Pub/Sub and stream hub against a real `redis:7.2` (Docker). The generator, the "pods" and the viewers share one Node process on one dev machine, so the Node figures are a pessimistic lower bound per pod. HTTP, auth and the per-fix route lookup in Postgres are not included.

| Scenario | Ingest achieved | Ingest p50 / p99 | Delivery p95 (incl. 500 ms conflation) | Event-loop lag p99 | Redis CPU |
|---|---|---|---|---|---|
| 2,000 cabs @ 0.5 Hz, 2 pods, 10 viewers | ~900 fixes/s, 0 errors, 100% to stream | 7 / 22 ms | 503 ms | 26 ms | 8% of a core |
| 3,000 cabs @ 1 Hz, 1 pod, 5 viewers | ~2,700 fixes/s | 14 / 59 ms | 618 ms | 55 ms | 21% |
| 10,000 cabs @ 1 Hz, 2 pods (one process), 20 viewers | ~6,000 fixes/s (process saturated) | 67 / 185 ms | 948 ms | 292 ms | 60% |
| same, live publishing disabled (for comparison) | ~9,000 fixes/s | — / 81 ms | — | 89 ms | 49% |

What the numbers mean:

* **Per-pod sizing:** plan for **≤ 2,500 fixes/s per API pod**. That keeps ingest p99 under about 60 ms and event-loop lag p99 under about 55 ms with viewers attached. 10k fixes/s therefore needs **≥ 4 ingest pods**, plus the separate realtime gateway in Phase 2 §4.
* **Redis:** the Lua ingest costs about 0.05 ms of Redis CPU per fix. Live fan-out roughly doubled that before this pass. Two changes reduced it: per-channel batching (`TELEMETRY_PUBLISH_BATCH_MS=100`), and dropping the per-route channel, which could never batch because each route gets about 1 fix/s. **Above ~5k fixes/s, set `REDIS_PUBSUB_URL`** so fan-out runs on its own Redis instance and doesn't compete with ingest.
* The earlier spec's "< 18% of one core at 10k/s" was never measured and is not achievable with one Redis carrying both ingest and fan-out.
* Browser rendering: see §5, Ops renderer.

At 10k vehicles, sending the *whole* fleet to every browser is still a lot of bytes (about 3 MB/s per viewer). **Viewport subscriptions** (Phase 2 §1) remain the next step. Redis Cluster broadcasts classic `PUBLISH` to every node; in cluster mode switch to **sharded Pub/Sub** (`SPUBLISH`/`SSUBSCRIBE`) keyed by tenant.

---

## 4. Latency budget (target p95, end-to-end device fix → pixel)

| Hop | Budget |
|---|---|
| Device → API (cellular) | 60–150 ms (outside our control) |
| Ingest (1 EVALSHA + pipelined PUBLISH) | ≤ 5 ms |
| Redis → SSE gateway | ≤ 5 ms |
| Conflation flush window | 0–500 ms (avg 250 ms), tunable via `TELEMETRY_SSE_FLUSH_MS` |
| Network to browser | 20–80 ms |
| Render (next rAF) | ≤ 16 ms |
| **Total p95 target** | **≤ 800 ms** at 500 ms flush; ≤ 400 ms at 100 ms flush |

The earlier "≤185 ms" budget ignored the flush window and cellular p95. The ops UI interpolates over the inter-fix gap anyway, so a sub-second target is honest and sufficient. Lower the flush interval only if the load test shows headroom.

---

## 5. Changes made in this review

**Pass 1 (commit b80eae0)**

| Area | Change | Tests |
|---|---|---|
| Security #1 | `resolveJwtSecret()` in `config/auth.config.ts`: in production, boot fails if the secret is missing, is a known published dev value, or is < 32 chars. Guard and auth service no longer contain literal fallbacks | `auth-config-secrets.spec.ts` |
| SSE #3/#4 | `TelemetryStreamHub`: one Redis subscription per channel per pod (refcounted), parse once, per-connection conflation by vehicle, 500 ms batched `fixes` frames, skip flush when socket write buffer > 1 MB, close with `reauth` at JWT `exp` or after 1 h max, per-user cap (5) → 429 | `telemetry-live-stream.spec.ts` |
| Ingest #6–#8 | Atomic Lua ingest (dedupe + monotonic latest + XADD), chunked `MGET` snapshot, on-demand trips in the snapshot and on the stream as `kind: TRIP`, on-demand Postgres writes throttled to 1 per 10 s per trip | `telemetry-ingest-atomic.spec.ts`, `corporate-ws-b-tracking.spec.ts` |
| Ops #5/#9/#10 | No per-fix React state (1 s UI tick), telemetry merge, dark theme fixed, viewport-culled animation, TRIP markers + panel, vehicle list with search and filters | ops `tsc` + lint |

**Pass 2**

| Area | Change | Verified by |
|---|---|---|
| Stream tickets (was Phase 1 §1) | `StreamTicketService` + `POST /corporate/trips/live-stream-tickets`. The guard accepts only `?ticket=` on live-stream GETs and never a raw access token in a URL. The ops map buys a ticket per connect | `telemetry-stream-auth.spec.ts`; real Redis: two pods racing for one ticket → exactly one wins; headless Chrome |
| Revocation (was §2) | `RedisService.blacklistToken` / `revokeUserSessions` publish to `auth:revocations`; every pod's hub closes matching streams with `reauth {reason: REVOKED}` and no final batch | unit + real Redis (suspend on pod A closes the stream on pod B) |
| Redis TLS (was §3) | `redisTlsOptions()`: certificates **verified by default**; `REDIS_TLS_CA`, `REDIS_TLS_SERVERNAME`, opt-out `REDIS_TLS_REJECT_UNAUTHORIZED=false` with a startup warning | `telemetry-stream-auth.spec.ts` |
| Fan-out cost | `publishBatched` (one PUBLISH of a JSON array per channel per 100 ms, early flush at 2,000 items, flush on shutdown); per-route channel removed (route streams filter the tenant channel); optional `REDIS_PUBSUB_URL` | unit + real Redis + load test (§3) |
| Real-Redis suite | `test/telemetry-real-redis.int.spec.ts`: Lua accept/duplicate/out-of-order, 100 concurrent fixes from two pods (latest is always the newest), cross-pod `fixes`, ticket race, cross-pod revocation, recovery after `CLIENT KILL TYPE pubsub`. Skips itself when no Redis is at `TELEMETRY_IT_REDIS_URL` (default `localhost:6390`); **it FLUSHES that DB** | 6/6, stable over 5 runs |
| Ops renderer (was Phase 2 §2) | `fleetCanvasOverlay.ts` draws every cab on one canvas (batched paths, lat/lng pre-cull, hit-tested clicks/hover) instead of one `google.maps.Marker` per cab. Profiling showed Maps re-rasterising each Marker's canvas as the whole cost | headless Chrome frame times: 500 cabs 2 → 47 fps, 2,000 cabs 1 → 37 fps (software rendering, dev build) |
| Ops stream lifecycle | connection-generation guard: overlapping connects (dev double-mount, reconnect racing Resync) no longer leave an orphaned EventSource; `REVOKED` reconnects with backoff | headless Chrome against a contract-faithful fake API: 1 ticket → 1 stream; `reauth` → new ticket → new stream |
| Ops list | stable order (GPS state, then driver name) so rows no longer jump every second | headless Chrome |

Found and **not** fixed (outside this scope):
* `RedisService.revokeUserSessions()` has **no callers** in `src`. Suspending a user never revokes their sessions; the guard's `isUserRevoked` check and stream revocation only take effect once the admin suspend flow calls it.
* The corporate GPS endpoint (`corporate-trip-execution.service.ts` `ingestTelemetry`) reads the route **with all stops from Postgres on every fix** to compute next-stop ETA. That is a database read on the hot path; cache the route plan in Redis per route.

---

## 6. Phase 1: Hardening (remaining)

Done in pass 2: stream tickets, revocation during the stream, Redis TLS verification (see §5).

1. **Wire suspension to `revokeUserSessions()`** (admin suspend, password change). Without it, revocation never fires for suspensions.
2. **Shorten the access-token TTL** from `7d` to `15m` with refresh-token rotation (the ops client already refreshes on 401).
3. **Ingest rate limiting.** Per-driver token bucket (Lua, 2 fixes/s burst 5). Reject with 429 + `Retry-After`.
4. **Payload validation at the edge.** `class-validator` on the location DTOs: lat/lng range, speed 0–70 m/s, heading 0–360, accuracy 0–5,000 m, battery 0–100. Drop impossible jumps (> 250 km/h implied) from the live channel; keep them in history flagged `suspect`.
5. **Trip channel authorization** before exposing `telemetry:trip:{id}` to riders or vendors (ownership-guarded SSE).
6. **Device timestamp for on-demand pings:** add optional `recordedAt` to `TripLocationUpdateDto`; trips currently use server time.
7. **Cache the route plan** for the corporate GPS endpoint (see §5, not fixed).

## 7. Phase 2 — Scale to 10k vehicles (~1–2 sprints)

1. **Viewport subscriptions.** The client sends its map bounds (`PUT /realtime/streams/{id}/viewport` or a query param on reconnect). The hub filters each flush by bbox (+10% padding) and always includes the selected vehicle. Bytes per viewer then scale with what is visible, not fleet size. Zoomed out below a threshold, send **H3 res-7 cluster counts** instead of individual fixes.
2. ~~WebGL rendering~~ **Done as a single-canvas overlay** (§5). Revisit deck.gl `IconLayer` only if a viewport routinely shows > 5,000 cabs at once.
3. **Sharded Pub/Sub** if Redis moves to cluster mode: `SPUBLISH telemetry:{tenantId}:fleet`, with the ops-wide channel replaced by the gateway subscribing to all tenant shards via `SSUBSCRIBE` per shard.
4. **Separate the gateway process.** Run SSE as its own deployment (`apps/api` with a `ROLE=realtime` flag) so long-lived connections do not compete with request/response pods for event-loop time, and scale on connection count. Set ALB idle timeout ≥ 60 s (heartbeat is 25 s) and enable sticky sessions only if WebSocket is introduced.
5. **Idle-driver layer.** "All drivers" includes drivers who are online but not on a trip. Source them from the dispatch geo index (`GEOSEARCH` in the viewport) every 5 s, rendered greyed out, without per-fix streaming.

## 8. Phase 3 — Verification & SLOs (run before claiming production-grade)

1. **Load test** with k6 + `xk6-sse` (or a Node harness). Drive 10k synthetic vehicles at 1 Hz through the real ingest endpoint. Attach 50 SSE viewers, 5 of them throttled to 256 kbps. Record ingest p50/p95/p99, Redis CPU and `instantaneous_ops_per_sec`, Node event-loop lag, gateway RSS, and end-to-end latency (embed `recordedAt`; the viewer computes `now - recordedAt` with NTP-synced clocks).
   *Pass criteria:* ingest p99 ≤ 25 ms; event-loop lag p99 ≤ 50 ms; gateway RSS stable over 1 h (no growth from slow viewers); end-to-end p95 ≤ 800 ms; zero lost history rows (stream → PG count reconciliation).
2. **Chaos tests:** kill Redis for 60 s (ingest must keep returning 200 with `LOCAL_BUFFER`, the map shows RECONNECTING and then recovers with resubscription); kill one API pod (viewers reconnect to another within backoff); clock skew ±10 min on the device (clamped; never LIVE when stale).
3. **SLOs** (add to `19_OBSERVABILITY.md`): live-map freshness. ≥ 99% of active vehicles with a LIVE fix should show within 2 s of receipt (30-day window). Ingest availability 99.9%.
4. **Metrics** (Prometheus): `telemetry_ingest_total{outcome}`, `telemetry_ingest_duration_seconds`, `telemetry_publish_failures_total`, `telemetry_sse_connections{stream}`, `telemetry_sse_flush_skipped_total{reason="backpressure"}`, `telemetry_sse_frame_vehicles` (histogram), `corporate_gps_stream_lag` (XINFO GROUPS pending), `telemetry_e2e_latency_seconds` (sampled by the client and posted back).
5. **Alerts:** stream consumer lag > 30 s; SSE backpressure skips > 1%/min; Pub/Sub fell back to the in-process bus (multi-pod deployments lose cross-pod delivery); ratio of active routes without a LIVE fix > 20%.

## 9. Phase 4 — Product completeness on the ops map

* Route geometry for the selected vehicle: planned polyline (from the route plan) vs. actual trail (last 15 min from `/playback`).
* Stop ETAs and delay badges (`delayMinutes` is already in the contract but not populated). Compute it in the ETA worker and publish on change, not per fix.
* Alerts overlay: overspeed, deviation and tracking loss (already trip-event types), shown as map pins plus a toast feed.
* Driver actions from the panel: call (exists), message, reassign (link to dispatch).
* Accessibility: the vehicle list is keyboard-navigable, and state is shown by text as well as colour.

---

## 10. Test matrix

| Suite | Covers |
|---|---|
| `test/auth-config-secrets.spec.ts` | prod boot refuses missing, published or short secrets |
| `test/telemetry-stream-auth.spec.ts` | tickets (single use, hashed, expiry, revoked user), no raw token in URL, revocation closes streams, TLS options, publish batching, RedisModule wiring |
| `test/redis-pubsub.service.spec.ts` | pub/sub connections, fallback bus, resubscribe, patterns |
| `test/telemetry-live-stream.spec.ts` | fan-out channels, tenant isolation, conflation, lifetime/reauth, per-user cap, teardown, route stream via tenant channel |
| `test/telemetry-sse-http.spec.ts` | SSE over real HTTP: headers, `fixes` frames |
| `test/telemetry-ingest-atomic.spec.ts`, `test/corporate-ws-b-tracking.spec.ts` | Lua path + fallback, MGET snapshot, TRIP entries, tenant scoping, trip persistence gate |
| `test/telemetry-real-redis.int.spec.ts` | the same against a real Redis (run in CI with a `redis:7` service on port 6390) |
| `apps/api/scripts/telemetry-load.ts` | load harness (§3) |
| ops `tsc` + lint | map page, canvas overlay, `fleet-telemetry.ts` helpers |

CI follow-up: add a `redis:7` service container so the real-Redis suite runs on every PR instead of skipping.

---

## 11. Rollout

1. Deploy to staging with `TELEMETRY_SSE_FLUSH_MS=500`. Confirm the ops map, then run the Phase 3 load test there.
2. **Before the production deploy:** confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set (≥ 32 chars, not the `.env.example` values) in the prod secret store. Otherwise the API will now refuse to boot, by design.
3. **The ops page and API must ship together.** The new ops page needs `POST /live-stream-tickets`, and the new API no longer accepts `?access_token=` on streams.
4. **Redis TLS:** certificates are now verified. Managed Redis with public CAs works unchanged. A self-signed or private-CA endpoint needs `REDIS_TLS_CA` (or, temporarily, `REDIS_TLS_REJECT_UNAUTHORIZED=false`). Check this in staging first.
5. Watch event-loop lag, Redis CPU and stream lag for 24 h. Then lower the flush interval if desired.
