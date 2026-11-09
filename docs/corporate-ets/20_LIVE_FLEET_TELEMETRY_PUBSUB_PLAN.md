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
                                          │  pipelined PUBLISH (only if accepted):
                                          │    telemetry:ops:fleet
                                          │    telemetry:tenant:{tenantId}:fleet
                                          │    telemetry:route:{routeId} | telemetry:trip:{tripId}
                                          ▼
                                   Redis (L2 hot state + Pub/Sub, L3 Stream)
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
                                 → 1 s UI tick for lists/counters
```

### 2.1 Channel model

| Channel | Publishers | Subscribers | Authorization |
|---|---|---|---|
| `telemetry:ops:fleet` | corporate ingest, on-demand trips | ADMIN / OPS fleet stream | role ∈ {ADMIN, OPS} |
| `telemetry:tenant:{tenantId}:fleet` | corporate ingest | CORPORATE_ADMIN / MANAGER fleet stream | tenant from **token**, never from query |
| `telemetry:route:{routeId}` | corporate ingest | route stream (employee, driver, corporate) | `CorporateAccessGuard` resource check |
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
| both | `reauth` | sent just before the server closes at token expiry or max lifetime; the client refreshes and reconnects without backoff |

Clients **must** treat `gpsState` as advisory and re-derive it from `recordedAt` (LIVE ≤ 45 s, STALE ≤ 180 s, else OFFLINE) because frames age on screen.

### 2.3 Redis key model

| Key | Type | TTL | Purpose |
|---|---|---|---|
| `corporate:route:telemetry:{routeId}` | string (JSON) | 900 s | latest corporate fix (snapshot + tracking API) |
| `trip:telemetry:{tripId}` | string (JSON) | 900 s | latest on-demand fix (snapshot) |
| `corporate:gps:seen:{route}:{driver}:{ms}` | string | 600 s | re-upload dedupe |
| `trip:location:persist:{tripId}` | string | 10 s | gate: Postgres write at most every 10 s per trip |
| `corporate:gps:stream` | stream | MAXLEN ~1e6 | durable history buffer (consumer group `corporate:gps:writers`) |

---

## 3. Capacity model (targets, to be verified in Phase 3)

| Quantity | Standard | Peak |
|---|---|---|
| Active vehicles | 2,000 | 10,000 |
| Ping rate | 0.5 Hz | 1 Hz |
| Ingest | 1k fixes/s | 10k fixes/s |
| Redis ops per fix (after Lua) | 1 EVALSHA + 3 PUBLISH (pipelined) | same |
| Pub/Sub messages out per pod | 3 × ingest (one per channel) | 30k/s |
| SSE frames per ops viewer | 2/s (500 ms flush) regardless of fleet size | 2/s |
| SSE bytes per ops viewer | ≈ vehicles × 160 B × 2/s | 10k × 160 B × 2 = 3.2 MB/s, so **viewport filtering (Phase 2) is required at peak** |
| Postgres writes | batched 500 rows / 2 s per writer | 10k rows/s → 20 batches/s |

Two consequences drive the roadmap:

* At 10k vehicles, sending the *whole* fleet to every browser is too much (3.2 MB/s, and 10k markers will not render at 60 FPS with `google.maps.Marker`). Phase 2 adds **server-side viewport filtering** (bbox/geohash subscription) and **WebGL rendering**.
* Redis Cluster broadcasts classic `PUBLISH` to every node. If Redis moves to cluster mode, switch to **sharded Pub/Sub** (`SPUBLISH`/`SSUBSCRIBE`, Redis ≥ 7) keyed by tenant.

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

## 5. Changes made in this review pass

| Area | Change | Tests |
|---|---|---|
| Security #1 | `resolveJwtSecret()` in `config/auth.config.ts`: in production, boot fails if the secret is missing, is a known published dev value, or is < 32 chars. Guard and auth service no longer contain literal fallbacks | `test/auth-config-secrets.spec.ts` (5) |
| SSE #3/#4 | `TelemetryStreamHub`: one Redis subscription per channel per pod (refcounted), parse once, per-connection conflation by vehicle, 500 ms batched `fixes` frames, skip flush when socket write buffer > 1 MB, close with `reauth` at JWT `exp` or after 1 h max, per-user cap (5) → 429 | see §10 |
| Ingest #6–#8 | Atomic Lua ingest (dedupe + monotonic latest + XADD), pipelined publishes, chunked `MGET` snapshot, on-demand trips in the snapshot and on the stream as `kind: TRIP`, Postgres writes for on-demand pings throttled to once every 10 s per trip | see §10 |
| Ops #5/#9/#10 | No per-fix React state (1 s UI tick), telemetry merge, dark theme fixed, viewport-culled animation, `setIcon` only on visible change, distinct TRIP markers + panel, vehicle list with search and LIVE/STALE/OFFLINE + corporate/on-demand filters | see §10 |

---

## 6. Phase 1 — Hardening (remaining, ~1 sprint)

1. **SSE stream tickets (replaces `?access_token=`).**
   `POST /realtime/stream-ticket` (Bearer auth) → `{ ticket, expiresAt }`. The ticket is opaque, 32 random bytes, stored in Redis `sse:ticket:{hash}` → `{userId, role, tenantId, exp}` with a 30 s TTL, **single use** (`GETDEL`). The SSE endpoint accepts `?ticket=` only. Remove query-token support from `JwtAuthGuard`. *Why:* access tokens currently default to a 7-day lifetime and land in ALB/nginx/CloudFront logs.
2. **Revocation during the stream.** The hub subscribes to `auth:revoked` (published by logout, suspend and password change). On a matching `userId` it closes that user's streams with `reauth`.
3. **Redis TLS verification.** Add `REDIS_TLS_REJECT_UNAUTHORIZED` (default `true` in production; `false` allowed only with a startup warning) and an optional `REDIS_TLS_CA` path. Verify in staging first: ElastiCache/Upstash certs are publicly trusted, but a self-signed endpoint will stop connecting.
4. **Shorten the access-token TTL** from `7d` to `15m` with refresh-token rotation (the ops client already refreshes on 401).
5. **Ingest rate limiting.** Per-driver token bucket (Lua, 2 fixes/s burst 5) to stop a buggy or malicious app from flooding fan-out. Reject with 429 + `Retry-After`.
6. **Payload validation at the edge.** `class-validator` on the location DTOs: lat/lng range, speed 0–70 m/s, heading 0–360, accuracy 0–5,000 m, battery 0–100. Drop impossible jumps (> 250 km/h implied speed between consecutive fixes) from the live channel, but keep them in history flagged as `suspect`.
7. **Trip channel authorization.** Before exposing `telemetry:trip:{id}` to riders or vendors, add an `@Sse('trips/:id/live-stream')` guarded by trip ownership. Until then the channel stays server-internal.

## 7. Phase 2 — Scale to 10k vehicles (~1–2 sprints)

1. **Viewport subscriptions.** The client sends its map bounds (`PUT /realtime/streams/{id}/viewport` or a query param on reconnect). The hub filters each flush by bbox (+10% padding) and always includes the selected vehicle. Bytes per viewer then scale with what is visible, not fleet size. Zoomed out below a threshold, send **H3 res-7 cluster counts** instead of individual fixes.
2. **WebGL rendering.** Replace `google.maps.Marker` with deck.gl `IconLayer` via `GoogleMapsOverlay` (one draw call for all vehicles; interpolation in a typed array on rAF). Keep the legacy marker path for < 300 vehicles if bundle size matters. Note `google.maps.Marker` is deprecated (Feb 2024); the cloud-styled `AdvancedMarkerElement` requires a Map ID and `colorScheme` for dark mode.
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
| `test/redis-pubsub.service.spec.ts` | pub/sub connections, fallback bus, resubscribe, patterns |
| `test/telemetry-live-stream.spec.ts` | fan-out channels, tenant isolation, conflation, batching, lifetime/reauth, per-user cap, teardown |
| `test/telemetry-sse-http.spec.ts` | SSE over HTTP: headers, auth via query token on live-stream only |
| `test/corporate-ws-b-tracking.spec.ts` | ingest dedupe, monotonic latest (Lua + fallback), stream, snapshot (MGET, TRIP entries, tenant scoping) |
| `test/trips.service.spec.ts` | on-demand publish, latest key, 10 s persistence gate |
| ops `tsc` + lint | map page + `fleet-telemetry.ts` pure helpers |

Missing and required before GA: an integration test against a **real Redis** (docker `redis:7` in CI) for the Lua script and resubscribe-after-restart, and the Phase 3 load test.

---

## 11. Rollout

1. Deploy to staging with `TELEMETRY_SSE_FLUSH_MS=500`. Confirm the ops map, then run the Phase 3 load test there.
2. **Before the production deploy:** confirm `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are set (≥ 32 chars, not the `.env.example` values) in the prod secret store. Otherwise the API will now refuse to boot, by design.
3. The ops page and API must ship together: the fleet stream frame format changed (`fixes` array). The ops client still accepts single-object `message` frames, so an old API with a new ops page works. A new API with an old ops page does not.
4. Watch `telemetry_sse_connections`, event-loop lag and stream lag for 24 h. Then lower the flush interval if desired.
